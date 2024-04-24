document.addEventListener('DOMContentLoaded', function () {
    function addRow() {
        const foodDetails = document.querySelector('.food-details');
        const newFoodRow = foodDetails.firstElementChild.cloneNode(true);

        newFoodRow.querySelectorAll('input').forEach(input => input.value = '');

        const removeButton = document.createElement('button');
        removeButton.setAttribute('type', 'button');
        removeButton.classList.add('btn', 'btn-danger', 'remove-row');
        removeButton.innerHTML = '<i class="fas fa-minus"></i>';
        removeButton.addEventListener('click', function () {
            newFoodRow.remove();
        });

        newFoodRow.querySelector('.input-group').appendChild(removeButton);
        foodDetails.appendChild(newFoodRow);
        newFoodRow.querySelector('.add-row').addEventListener('click', addRow);
    }

    document.querySelector('.add-row').addEventListener('click', addRow);

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('remove-row')) {
            event.target.closest('.mb-3').remove();
        }
    });

    document.querySelector('#foodForm').addEventListener('submit', function (event) {
        console.log('Form Submitted!');
    });
});