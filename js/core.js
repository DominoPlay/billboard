$(document).ready(function() {


    $('.main__slider').slick({
        slidesToScroll: 1,
        slidesToShow: 1,
        autoplay: false,
        fade: true,
        autoplaySpeed: 3000,
        pauseOnHover: true,
        draggable: false,
        arrows: false,
        dots: false,
    });

    $('.banner__slider').slick({
        slidesToScroll: 1,
        slidesToShow: 1,
        autoplay: true,
        fade: true,
        autoplaySpeed: 5000,
        pauseOnHover: true,
        draggable: false,
        arrows: false,
        dots: false,
        speed: 500,
    });

    $('.banner__footer').slick({
        slidesToScroll: 1,
        slidesToShow: 1,
        autoplay: true,
        // fade: true,
        autoplaySpeed: 3000,
        pauseOnHover: true,
        draggable: false,
        arrows: false,
        dots: false,
    });

    $('.banner__small').slick({
        slidesToScroll: 1,
        slidesToShow: 1,
        autoplay: true,
        // fade:true,
        autoplaySpeed: 5000,
        duration: 500,
        pauseOnHover: true,
        draggable: false,
        arrows: false,
        dots: false,
        speed: 800
    })

    $('.banner__small_l_size').slick({
        slidesToScroll: 1,
        slidesToShow: 1,
        autoplay: true,
        // fade:true,
        autoplaySpeed: 5000,
        duration: 500,
        pauseOnHover: true,
        draggable: false,
        arrows: false,
        dots: false,
        speed: 800
    });

    var clock = new Vue({
        el: '#clock',
        data: {
            time: ''
        }
    });

    var timerID = setInterval(updateTime, 1000);
    updateTime();

    function updateTime() {
        var cd = new Date();
        clock.time = zeroPadding(cd.getHours(), 2) + ':' + zeroPadding(cd.getMinutes(), 2);
    };

    function zeroPadding(num, digit) {
        var zero = '';
        for (var i = 0; i < digit; i++) {
            zero += '0';
        }
        return (zero + num).slice(-digit);
    }

});
