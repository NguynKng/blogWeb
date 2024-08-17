//-----------------EVENT--------------
document.addEventListener('DOMContentLoaded', function() {
    function validatePasswords(event) {
        const password = document.getElementById('inputPassword').value;
        const confirmPassword = document.getElementById('inputPassword2').value;
        const message = document.getElementById('message');

        if (password === confirmPassword) {
            return true; 
        } else {
            message.style.color = 'red';
            message.textContent = 'Passwords do not match! Please try again.';
            event.preventDefault();
            return false;
        }
    }

    function validate(event) {
        validatePasswords(event)
        validateEmail(event)
    }

    function validateEmail(event) {
        const email = document.getElementById('inputEmail').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailRegex.test(email) == true) {
            return true;
        }else {
            const message = document.getElementById('message');
            message.classList.remove("hidden");
            message.classList.add("active");
            message.style.color = 'red';
            message.textContent = 'Invalid email format!';
            event.preventDefault();
            return false;
        }
    }

    // Assign the validatePasswords function to the form's onsubmit event
    const form = document.querySelector('form');
    form.onsubmit = validate;
});
//------------FUNCTION------------

//---------OPEN-MODAL-----//
function openModal(imageSrc) {
    const image = JSON.parse(imageSrc);
    var modal = document.getElementById("imageModal");
    var modalImg = document.getElementById("modalImage");
    modal.style.display = "block";
    modalImg.src = '/' + image.path;
    modalImg.setAttribute('img-ID', image._id)
}

//---------CLOSE-MODAL-----//
function closeModal() {
    var modal = document.getElementById("imageModal");
    modal.style.display = "none";
}

//---------SET-THUMBNAIL-----//
async function setThumbnail() {
    var modalImage = document.getElementById("modalImage");
    var modalURL = modalImage.src;

    // Extract the path from the full URL
    var url = new URL(modalURL);
    var imagePath = url.pathname;
    var imgID = modalImage.getAttribute('img-id')
    var blogElement = document.getElementById("blogID");
    var blogId = blogElement.getAttribute('data-blog-id');
    var c = confirm("Are you sure you want to set this image as thumbnail ?");

    if (c == true) {
        try {
            // Send a request to update the post's thumbnail
            const response = await fetch(`/admin/blogs/edit/${blogId}/set-thumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ thumbnail: { _id: imgID, path: imagePath } })
            });
            const result = await response.json()
            if (result.success == "true") {
                alert(result.message); // Show success message
                closeModal();
            } else {
                alert(result.message); // Show error message if already set
                closeModal();
            }
        } catch (error) {
            console.error("Error setting thumbnail:", error);
            alert("Failed to set thumbnail !");
        }
    } else {
        alert("No image selected.");
    }
}

//---------DELETE-BLOG-----//
function deleteBlog(id) {
    var c = confirm("Are you sure you want to delete this post ?");
    if (c == true) {
        fetch('/admin/blogs/' + id, {
            method: "delete"
            }).then(function(res){
                return res.json();
            }).then(function(data){
                console.info(data);
                var p = document.getElementById(id);
                p.style.display = 'none';
            }).catch(function(error){
                console.error(error);
        });
    }
}

//---------DELETE-IMAGE-----//
function deleteImage(post_id, imageId) {
    var c = confirm("Are you sure you want to delete this image ?");
    if (c == true) {
        fetch('/admin/blogs/edit/' + post_id + '/delete-image/' + imageId, {
            method: "delete"
            }).then(function(res){
                return res.json();
            }).then(function(data){
                console.info(data);
                var p = document.getElementById(imageId);
                p.style.display = 'none';
            }).catch(function(error){
                console.error(error);
        });
    }
}

//---------DELETE-TOPIC-----//
function deleteTopic(id) {
    var c = confirm("Are you sure you want to delete this topic ?");
    if (c == true) {
        fetch('/admin/topics/' + id, {
            method: "delete"
            }).then(function(res){
                return res.json();
            }).then(function(data){
                console.info(data);
                var p = document.getElementById(id);
                p.style.display = 'none';
            }).catch(function(error){
                console.error(error);
        });
    }
}

//---------DELETE-USER-----//
function deleteUser(id) {
    var c = confirm("Are you sure you want to delete this user ?");
    if (c == true) {
        fetch('/admin/users/' + id, {
            method: "delete"
            }).then(function(res){
                return res.json();
            }).then(function(data){
                console.info(data);
                var p = document.getElementById(id);
                p.style.display = 'none';
            }).catch(function(error){
                console.error(error);
        });
    }
}

function getPostURL(post_id, topic){
    const topicSlug = topic.toLowerCase().replace(/\s+/g, '-')
    return `/${topicSlug}/${post_id}`
}
//-----------------------CKEditor----------------
function initializeCKEditor(){
    CKEDITOR.replace("content", {
        extraPlugins: 'uploadimage',
        filebrowserBrowseUrl: '/admin/blogs/browse-images', // Your server-side endpoint
        filebrowserUploadUrl: `/admin/blogs/upload-image`, // Your server-side endpoint
        filebrowserUploadMethod: 'form', // Method for file uploads
        height: 500,
        allowedContent: true
    })
};