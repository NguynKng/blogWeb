//-----------------EVENT-----------
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
//-----------------------CKEditor----------------
ClassicEditor.create( document.querySelector('#content'), {
        toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote' ],
        heading: {
            options: 
            [
                { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' }
            ]
        }
    } )
    .catch( error => {
        console.log( error );
    } );

//-----------------------IMAGE-PREVIEW------------------------
// Get the modal
const modal = document.getElementById("imageModal");

// Get the image and insert it inside the modal - use its "alt" text as a caption
const modalImg = document.getElementById("previewImg");
const captionText = document.getElementById("caption");
const thumbnails = document.querySelectorAll('.thumbnail');

thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function () {
        modal.style.display = "block";
        modalImg.src = this.dataset.src;
        captionText.innerHTML = this.alt;
    });
});

// Get the <span> element that closes the modal
const span = document.getElementsByClassName("close")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
    modal.style.display = "none";
}