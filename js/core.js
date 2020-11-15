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

    var makeItRain = function() {
        //clear out everything
        $('.rains').empty();

        var increment = 0;
        var drops = "";
        var backDrops = "";

        while (increment < 100) {
            //couple random numbers to use for various randomizations
            //random number between 98 and 1
            var randoHundo = (Math.floor(Math.random() * (98 - 1 + 1) + 1));
            //random number between 5 and 2
            var randoFiver = (Math.floor(Math.random() * (5 - 2 + 1) + 2));
            //increment
            increment += randoFiver;
            //add in a new raindrop with various randomizations to certain CSS properties
            drops += '<div class="drop" style="left: ' + increment + '%; bottom: ' + (randoFiver + randoFiver - 1 + 100) + '%; animation-delay: 0.' + randoHundo + 's; animation-duration: 0.5' + randoHundo + 's;"><div class="stem" style="animation-delay: 0.' + randoHundo + 's; animation-duration: 0.5' + randoHundo + 's;"></div><div class="splat" style="animation-delay: 0.' + randoHundo + 's; animation-duration: 0.5' + randoHundo + 's;"></div></div>';
            backDrops += '<div class="drop" style="right: ' + increment + '%; bottom: ' + (randoFiver + randoFiver - 1 + 100) + '%; animation-delay: 0.' + randoHundo + 's; animation-duration: 0.5' + randoHundo + 's;"><div class="stem" style="animation-delay: 0.' + randoHundo + 's; animation-duration: 0.5' + randoHundo + 's;"></div><div class="splat" style="animation-delay: 0.' + randoHundo + 's; animation-duration: 0.5' + randoHundo + 's;"></div></div>';
        }

        $('.rains.front-row').append(drops);
        $('.rains.back-row').append(backDrops);
    }

    $('.splat-toggle.toggle').on('click', function() {
        $('body').toggleClass('splat-toggle');
        $('.splat-toggle.toggle').toggleClass('active');
        makeItRain();
    });

    $('.back-row-toggle.toggle').on('click', function() {
        $('body').toggleClass('back-row-toggle');
        $('.back-row-toggle.toggle').toggleClass('active');
        makeItRain();
    });

    $('.single-toggle.toggle').on('click', function() {
        $('body').toggleClass('single-toggle');
        $('.single-toggle.toggle').toggleClass('active');
        makeItRain();
    });

    makeItRain();

    $("#retroclockbox1").flipcountdown({
        size: "md",
        showSecond: true
    });

    $("#retroclockbox2").flipcountdown({
        size: "lg",
        showSecond: true
    })

    $(function() {


        $('#future_date').countdowntimer({
            dateAndTime: "2019/01/01 00:00:00",
            labelsFormat: true,
            displayFormat: "DHM"
        });
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