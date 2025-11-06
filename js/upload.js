const form = document.getElementById("uploadForm");
const status = document.getElementById("status");
const imageInput = document.querySelector('input[name="imageFile"]');
const imagePreview = document.getElementById("imagePreview");

const confirmModal = document.getElementById("confirmModal");
const confirmText = document.getElementById("confirmText");
const confirmImage = document.getElementById("confirmImage");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");

let formDataGlobal = null; // store form data temporarily

// GitHub repo info – replace with your own
const REPO_OWNER = "Fardanpex";
const REPO_NAME = "Harkein-Website";
const DATA_FILE_PATH = "js/data.js";
const IMAGE_FOLDER = "images/";
const BRANCH = "main";
const GITHUB_TOKEN = "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";

// Image preview
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    imagePreview.src = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    imagePreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// Form submit → show confirmation modal
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const category = form.category.value;
  const title = form.title.value;
  const price = form.price.value;
  const location = form.location.value;
  const description = form.description.value;
  const imageFile = form.imageFile.files[0];

  if (!imageFile) {
    status.innerText = "Please select an image file!";
    return;
  }

  formDataGlobal = { category, title, price, location, description, imageFile };

  // Show modal
  confirmText.innerHTML = `<strong>Category:</strong> ${category}<br>
                           <strong>Title:</strong> ${title}<br>
                           <strong>Price:</strong> ${price}<br>
                           ${category === "properties" ? `<strong>Location:</strong> ${location}<br>` : ""}
                           <strong>Description:</strong> ${description}`;
  const reader = new FileReader();
  reader.onload = e => confirmImage.src = e.target.result;
  reader.readAsDataURL(imageFile);

  confirmModal.style.display = "flex";
});

// Cancel modal
cancelBtn.addEventListener("click", () => {
  confirmModal.style.display = "none";
});

// Confirm modal → upload listing
confirmBtn.addEventListener("click", async () => {
  confirmModal.style.display = "none";
  await uploadListing(formDataGlobal);
  formDataGlobal = null;
});

// Upload listing + image to GitHub
async function uploadListing({ category, title, price, location, description, imageFile }) {
  try {
    // Upload image
    const imageContent = await fileToBase64(imageFile);
    const imagePath = IMAGE_FOLDER + imageFile.name;

    let imageSha = null;
    try {
      const existingImage = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${imagePath}?ref=${BRANCH}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
      if (existingImage.ok) {
        const data = await existingImage.json();
        imageSha = data.sha;
      }
    } catch {}

    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${imagePath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Upload image for ${title}`,
        content: imageContent,
        sha: imageSha,
        branch: BRANCH
      })
    });

    // Fetch current data.js
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const fileData = await res.json();
    const content = atob(fileData.content);

    // Create new listing
    let newItem = { title, price, description, image: imagePath };
    if (category === "properties") newItem.location = location;

    // Append new listing
    const updatedContent = content.replace(
      `const ${category} = [`,
      `const ${category} = [\n  ${JSON.stringify(newItem)},`
    );

    // Commit updated data.js
    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add new ${category.slice(0, -1)}: ${title}`,
        content: btoa(updatedContent),
        sha: fileData.sha,
        branch: BRANCH
      })
    });

    status.innerText = `Listing and image uploaded successfully!`;
    form.reset();
    imagePreview.style.display = "none";

  } catch (err) {
    console.error(err);
    status.innerText = "Error uploading listing. Check console.";
  }
}

// Utility: file → base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = err => reject(err);
  });
}
