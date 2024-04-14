$(document).ready(function () {
    $('.accordion-item').click(function () {
        $(this).toggleClass('active');
        $(this).next('.faq-answer').slideToggle(300);

        $('.faq-answer').not($(this).next('.faq-answer')).slideUp(300);
        $('.accordion-item').not(this).removeClass('active');
        console.log("hello")
    });
});