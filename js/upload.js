const file = document.querySelector('input[name="imageFile"]').files[0];

let imageUrl = "";
if (file) {
  imageUrl = await uploadImageToCloudinary(file);
}
