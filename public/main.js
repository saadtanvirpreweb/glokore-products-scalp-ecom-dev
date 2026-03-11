$(document).ready(function () {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Shared state
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var overlayImgMainSwiper, overlayImgThumbSwiper;
  var overlayVidMainSwiper, overlayVidThumbSwiper;
  var hlsInstances = {};
  var hlsIdCounter = 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Pause all videos utility
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function pauseAllOverlayVideos() {
    if ($("#tab-videos .swiper-slide").length) {
      $('#tab-videos .swiper-slide').each(function () {
        var $slide = $(this);
        var $videoEl = $slide.find('.video-el');
        var $poster = $slide.find('.video-poster');
        var $playBtn = $slide.find('.video-play-btn');
        var videoEl = $videoEl.get(0);

        if (videoEl && !videoEl.paused) {
          videoEl.pause();
        }

        $videoEl.addClass('hidden').prop('controls', false);
        $poster.removeClass('hidden');
        $playBtn.removeClass('hidden');
      });
    }
  }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Play video utility
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function playOverlayVideo($slide, showControls) {
    if (!$slide || !$slide.length) return;

    var videoSrc = $slide.attr('data-video-src');
    var $videoEl = $slide.find('.video-el');
    var $poster = $slide.find('.video-poster');
    var $playBtn = $slide.find('.video-play-btn');
    var videoEl = $videoEl.get(0);
    var hlsId = $videoEl.attr('data-hls-id');

    if (!videoSrc || !videoEl) return;

    // Swap poster → video
    $poster.addClass('hidden');
    $playBtn.addClass('hidden');
    $videoEl.removeClass('hidden');

    // Set controls based on parameter
    videoEl.controls = showControls === true;

    // Attach HLS if first time
    if (!hlsInstances[hlsId]) {
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        var hls = new Hls({
          maxBufferLength: 10,
          maxMaxBufferLength: 30,
          startLevel: -1,
        });
        hls.loadSource(videoSrc);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          videoEl.play().catch(function (error) {
            console.log('Autoplay prevented:', error);
          });
        });
        hlsInstances[hlsId] = hls;
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        videoEl.src = videoSrc;
        $(videoEl).one('loadedmetadata', function () {
          videoEl.play().catch(function (error) {
            console.log('Autoplay prevented:', error);
          });
        });
        hlsInstances[hlsId] = 'native';
      }
    } else {
      videoEl.play().catch(function (error) {
        console.log('Autoplay prevented:', error);
      });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Open / Close
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function initOverlayControls() {
    var $backdrop = $('#overlayBackdrop');
    var $panel = $('#overlayPanel');

    if (!$backdrop.length || !$panel.length) return;

    function openOverlay() {
      $backdrop.removeClass('hidden');
      $panel.removeClass('hidden');
      $('body').css('overflow', 'hidden');

      // Small delay to ensure DOM is rendered before updating swipers
      setTimeout(function () {
        if (overlayImgMainSwiper) overlayImgMainSwiper.update();
        if (overlayImgThumbSwiper) overlayImgThumbSwiper.update();

        // Check if video tab is active and auto-play first video
        if ($('.overlay-tab-btn[data-tab="videos"]').hasClass('active')) {
          var $firstSlide = $('#tab-videos .swiper-slide').first();
          if ($firstSlide.length) {
            playOverlayVideo($firstSlide, false); // false = no controls
          }
        }
      }, 100);
    }

    function closeOverlay() {
      $backdrop.addClass('hidden');
      $panel.addClass('hidden');
      $('body').css('overflow', '');
      pauseAllOverlayVideos();
    }

    // Expose openOverlay globally for productGallery to call
    window.openGalleryOverlay = openOverlay;

    $('#closeOverlay').on('click', closeOverlay);
    $backdrop.on('click', closeOverlay);

    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && !$panel.hasClass('hidden')) {
        closeOverlay();
      }
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Tab Switching
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function initOverlayTabs() {
    if (!$('.overlay-tab-btn').length) return;

    $('.overlay-tab-btn').on('click', function () {
      var $btn = $(this);
      var target = $btn.data('tab');

      $('.overlay-tab-btn').removeClass('active');
      $btn.addClass('active');

      $('.overlay-tab-content').addClass('hidden');
      $('#tab-' + target).removeClass('hidden');

      // Small delay for DOM rendering
      setTimeout(function () {
        if (target === 'images') {
          pauseAllOverlayVideos();
          if (overlayImgMainSwiper) overlayImgMainSwiper.update();
          if (overlayImgThumbSwiper) overlayImgThumbSwiper.update();
        } else if (target === 'videos') {
          if (overlayVidMainSwiper) overlayVidMainSwiper.update();
          if (overlayVidThumbSwiper) overlayVidThumbSwiper.update();

          // Auto-play the first video when video tab is activated
          var $firstSlide = $('#tab-videos .swiper-slide').first();
          if ($firstSlide.length) {
            playOverlayVideo($firstSlide, false); // false = no controls
          }
        }
      }, 100);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Image Swipers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function initOverlayImageSwipers() {
    // Use more specific selectors
    var $imgThumb = $('#tab-images .overlay-swiper-thumbs');
    var $imgMain = $('#tab-images .overlay-swiper-main');

    if (!$imgMain.length || !$imgThumb.length) {
      console.warn('Image swiper elements not found');
      return;
    }

    overlayImgThumbSwiper = new Swiper($imgThumb[0], {
      spaceBetween: 8,
      slidesPerView: 'auto',
      freeMode: true,
      watchSlidesProgress: true,
      // Remove direction: 'vertical' to allow horizontal wrapping
    });

    overlayImgMainSwiper = new Swiper($imgMain[0], {
      spaceBetween: 10,
      thumbs: {
        swiper: overlayImgThumbSwiper,
      },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: Video Swipers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function initOverlayVideoSwipers() {
    if ($("#tab-videos").length) {


      // Use more specific selectors
      var $vidThumb = $('#tab-videos .overlay-swiper-thumbs');
      var $vidMain = $('#tab-videos .overlay-swiper-main');

      if (!$vidMain.length || !$vidThumb.length) {
        console.warn('Video swiper elements not found');
        return;
      }

      overlayVidThumbSwiper = new Swiper($vidThumb[0], {
        spaceBetween: 8,
        slidesPerView: 'auto',
        freeMode: true,
        watchSlidesProgress: true,
      });

      overlayVidMainSwiper = new Swiper($vidMain[0], {
        spaceBetween: 10,
        thumbs: {
          swiper: overlayVidThumbSwiper,
        },
        on: {
          slideChange: function () {
            // Pause all videos first
            pauseAllOverlayVideos();

            // Auto-play the new active slide without controls
            var activeIndex = this.activeIndex;
            var $activeSlide = $(this.slides[activeIndex]);
            playOverlayVideo($activeSlide, false); // false = no controls
          },
        },
      });
    }
  }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERLAY: HLS Video Playback (click-to-play)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function initOverlayVideoPlayback() {
    if ($("#tab-videos").length) {


      var $videoElements = $('#tab-videos .video-el');

      if (!$videoElements.length) {
        console.warn('No video elements found');
        return;
      }

      // Assign unique IDs for HLS instance tracking
      $videoElements.each(function () {
        var uid = 'hls-' + hlsIdCounter++;
        $(this).attr('data-hls-id', uid);
      });

      // Handle click on main play button overlay (shows controls)
      $(document).on('click', '.main-play-overlay.video-play-btn', function () {
        var $slide = $(this).closest('.swiper-slide');
        playOverlayVideo($slide, true); // true = show controls
      });

      // Handle thumbnail clicks (no controls, auto-play)
      $(document).on('click', '#tab-videos .overlay-swiper-thumbs .swiper-slide', function () {
        var index = $(this).index();

        if (overlayVidMainSwiper) {
          // Pause all videos first
          pauseAllOverlayVideos();

          // Slide to the clicked thumbnail
          overlayVidMainSwiper.slideTo(index);

          // Get the corresponding main slide and play without controls
          var $targetSlide = $(overlayVidMainSwiper.slides[index]);
          setTimeout(function () {
            playOverlayVideo($targetSlide, false); // false = no controls
          }, 300); // Small delay to allow slide transition
        }
      });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PAGE-LEVEL: Product Gallery (existing, converted to jQuery)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function productGallery() {
    var $thumbs = $('.gallery-container .swiper-thumbs');
    var $main = $('.gallery-container .swiper-main');

    if (!$main.length) {
      console.warn('Product gallery main element not found');
      return;
    }

    var swiperThumbs = null;

    // Initialize thumbnails swiper only on desktop
    if ($thumbs.length && window.innerWidth >= 768) {
      swiperThumbs = new Swiper($thumbs[0], {
        direction: 'vertical', // Vertical for left sidebar
        spaceBetween: 8,
        slidesPerView: 'auto',
        freeMode: true,
        watchSlidesProgress: true,
        mousewheel: true, // Enable mouse wheel scrolling
      });
    }

    // Initialize main swiper
    var swiperMain = new Swiper($main[0], {
      spaceBetween: 10,
      thumbs: {
        swiper: swiperThumbs, // Will be null on mobile, which is fine
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: true, // Makes dots look better on mobile
      },
      on: {
        slideChange: function () {
          var activeSlide = this.slides[this.activeIndex];
          var $activeSlide = $(activeSlide);
          var videoUrl = $activeSlide.attr('data-video');
          var isViewMore = $activeSlide.attr('data-viewmore');

          // Handle video
          if (videoUrl) {
            var video = $activeSlide.find('video').get(0);
            if (video && typeof Hls !== 'undefined' && Hls.isSupported()) {
              var hls = new Hls();
              hls.loadSource(videoUrl);
              hls.attachMedia(video);
            }
          }

          // Handle view more — open the new overlay
          if (isViewMore && typeof window.openGalleryOverlay === 'function') {
            window.openGalleryOverlay();
          }
        },
      },
    });

    // Handle view more click on thumbnail (desktop only)
    $('.gallery-container [data-viewmore="true"]').on('click', function () {
      if (typeof window.openGalleryOverlay === 'function') {
        window.openGalleryOverlay();
      }
    });

    // Re-initialize on window resize
    var resizeTimer;
    $(window).on('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var isDesktop = window.innerWidth >= 768;

        // Destroy and reinitialize thumbnails based on screen size
        if (isDesktop && !swiperThumbs && $thumbs.length) {
          swiperThumbs = new Swiper($thumbs[0], {
            direction: 'vertical',
            spaceBetween: 8,
            slidesPerView: 'auto',
            freeMode: true,
            watchSlidesProgress: true,
            mousewheel: true,
          });

          // Update main swiper to use thumbnails
          if (swiperMain && swiperMain.params) {
            swiperMain.params.thumbs.swiper = swiperThumbs;
            swiperMain.thumbs.init();
            swiperMain.thumbs.update();
          }
        } else if (!isDesktop && swiperThumbs) {
          swiperThumbs.destroy(true, true);
          swiperThumbs = null;
        }

        // Update main swiper
        if (swiperMain) {
          swiperMain.update();
        }
      }, 250);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXISTING FUNCTIONS (unchanged)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function HeroScript() {
    var isMenuOpen = false;
    var $menuToggle = $('#menu-toggle');
    var $mobileMenu = $('#mobile-menu');
    var $hamburgerIcon = $('.hamburger-icon');
    var $closeIcon = $('.close-icon');
    var $dropdownContent = $('#dropdown-content');

    $menuToggle.on('click', function () {
      isMenuOpen = !isMenuOpen;

      if (isMenuOpen) {
        $hamburgerIcon.addClass('hidden');
        $closeIcon.removeClass('hidden');
        $menuToggle.attr('aria-label', 'Close menu');
        var contentHeight = $dropdownContent.outerHeight();
        $mobileMenu.css('height', contentHeight + 'px');
      } else {
        $hamburgerIcon.removeClass('hidden');
        $closeIcon.addClass('hidden');
        $menuToggle.attr('aria-label', 'Open menu');
        $mobileMenu.css('height', '0px');
      }
    });

    $('.nav-link, .mobile-nav-link').on('click', function (e) {
      e.preventDefault();

      if (isMenuOpen) {
        isMenuOpen = false;
        $hamburgerIcon.removeClass('hidden');
        $closeIcon.addClass('hidden');
        $menuToggle.attr('aria-label', 'Open menu');
        $mobileMenu.css('height', '0px');
      }

      var targetId = $(this).attr('href');
      var $targetElement = $(targetId);

      if ($targetElement.length) {
        var headerHeight = $('header').outerHeight();
        var elementPosition = $targetElement.offset().top;
        var offsetPosition = elementPosition - headerHeight;

        $('html, body').animate(
          {
            scrollTop: offsetPosition,
          },
          800
        );
      }
    });

    $(window).on('resize', function () {
      if (isMenuOpen) {
        var contentHeight = $dropdownContent.outerHeight();
        $mobileMenu.css('height', contentHeight + 'px');
      }
    });
  }

  function updateAfflinksLinksOutbound() {
    var urlParams = new URLSearchParams(window.location.search);
    var baseUrl = 'https://glokore.com/scalpmassager/checkout4/?affId=nva&unit=1&uid=2651&c2=756&c1=16';

    // Create URLSearchParams object from the base URL
    var baseUrlObj = new URL(baseUrl);
    var baseParams = new URLSearchParams(baseUrlObj.search);

    // Append all current page parameters to the base URL
    urlParams.forEach(function (value, key) {
      baseParams.append(key, value);
    });

    // Construct the final URL
    var finalUrl = baseUrlObj.origin + baseUrlObj.pathname + '?' + baseParams.toString();

    $('.aff-link').each(function () {
      $(this).attr('href', finalUrl);
    });
  }


  function updateHeroAfterHeight() {
    if ($('.hero-last-section').length) {
      var containerHeight = $('.hero-last-section').outerHeight();
      var containerVideoHeight = $('.video-container').outerHeight();
      var containerInfoHeight = $('.product-info').innerHeight();
      var totalGap = containerVideoHeight - containerInfoHeight;
      var newHeightDesktop = containerHeight + (totalGap > 0 ? totalGap + 14 : 16) + 0 + 'px';
      var newHeightDesktopXMedium = containerHeight + 24 + 'px';
      var newHeightDesktopSmaller = containerHeight + 16 + 'px';
      var newHeightXMobile = containerHeight + 16 + 'px';
      var newHeightMobile = containerHeight + 16 + 'px';

      var windowWidth = $(window).width();

      if (windowWidth >= 1260) {
        document.documentElement.style.setProperty('--hero-before-height', newHeightDesktop);
      } else if (windowWidth >= 1200) {
        document.documentElement.style.setProperty('--hero-before-height', newHeightDesktopXMedium);
      } else if (windowWidth >= 1024) {
        document.documentElement.style.setProperty('--hero-before-height', newHeightDesktopSmaller);
      } else if (windowWidth >= 768) {
        document.documentElement.style.setProperty('--hero-before-height', newHeightXMobile);
      } else {
        document.documentElement.style.setProperty('--hero-before-height', newHeightMobile);
      }
    }
  }



  function InitializeFAQ() {
    if ($('.faq-item').length) {
      $('.faq-answer').hide();
      var activeId = 1;

      $('.faq-item').eq(0).addClass('active');
      $('.faq-item').eq(0).find('.faq-answer').show();

      $('.faq-question').click(function () {
        var $faqItem = $(this).closest('.faq-item');
        var id = $faqItem.index() + 1;

        if (activeId === id) {
          $faqItem.removeClass('active');
          $faqItem.find('.faq-answer').slideUp(200);
          activeId = 0;
        } else {
          $('.faq-item').removeClass('active');
          $('.faq-answer').slideUp(200);

          $faqItem.addClass('active');
          $faqItem.find('.faq-answer').slideDown(200);
          activeId = id;
        }

        $('.faq-item').each(function (index) {
          var itemId = index + 1;
          var $iconContainer = $(this).find('.faq-icon');

          if (itemId === activeId) {
            $iconContainer.html(
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 31 30" fill="none">' +
              '<rect x="29.5" y="1" width="28" height="28" rx="14" transform="rotate(90 29.5 1)" stroke="black" stroke-width="2"/>' +
              '<rect x="23.5" y="16" width="16" height="2" transform="rotate(180 23.5 16)" fill="black"/>' +
              '</svg>'
            );
          } else {
            $iconContainer.html(
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 31 30" fill="none">' +
              '<rect x="1.5" y="1" width="28" height="28" rx="14" stroke="black" stroke-width="2"/>' +
              '<rect x="7.5" y="14" width="16" height="2" fill="black"/>' +
              '<rect x="16.5" y="7" width="16" height="2" transform="rotate(90 16.5 7)" fill="black"/>' +
              '</svg>'
            );
          }
        });
      });
    }
  }

  // Duplicate marquee content for smooth scrolling
  if ($('#marquee').length) {
    var clone = $('#marquee').html();
    $('#marquee').html(clone + clone);

    var updateSpeed = function () {
      var width = $(window).width();
      var speed = width < 768 ? '70s' : '40s';

      if ($('.marquee-content').length) {
        $('.marquee-content').css('animation-duration', speed);
      }
    };

    updateSpeed();
    $(window).on('resize', updateSpeed);
  }

  function initializeCountdown() {
    setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    var countdown = $('.countdown').text();
    if (!countdown) return;
    var parts = countdown.split(':').map(Number);
    var hours = parts[0], minutes = parts[1], seconds = parts[2];

    seconds--;
    if (seconds < 0) {
      seconds = 59;
      minutes--;
      if (minutes < 0) {
        minutes = 59;
        hours--;
      }
    }

    $('.countdown').text(
      String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
    );
  }

  function disableClick() {
    $(document).on('contextmenu', function (e) {
      e.preventDefault();
    });

    $(document).keydown(function (e) {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'C' || e.key === 'S')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
    });

    $('body').on('mousedown mouseup click', function (e) {
      if (!$(e.target).closest('a').length) {
        e.preventDefault();
        return false;
      }
    });
  }

  function updateLogoSources() {
    var isMobile = window.innerWidth < 768;

    $('[data-logo-index]').each(function () {
      var $img = $(this).find('img');
      var desktopSrc = $img.data('desktop-src');
      var mobileSrc = $img.data('mobile-src');

      if (isMobile && mobileSrc) {
        $img.attr('src', mobileSrc);
      } else if (desktopSrc) {
        $img.attr('src', desktopSrc);
      }
    });
  }

  var MOBILE_WIDTH = 768;
  var fixedBottomCta = document.getElementById('fixed-bottom-cta');
  var showByScroll = false;
  var isMobile = false;

  function checkMobile() {
    isMobile = window.innerWidth < MOBILE_WIDTH;
    updateCTAVisibility();
  }

  var heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    var observer = new IntersectionObserver(
      function (entries) {
        showByScroll = !entries[0].isIntersecting;
        updateCTAVisibility();
      },
      { threshold: 0 }
    );

    observer.observe(heroSection);
  }

  function updateCTAVisibility() {
    if (fixedBottomCta) {
      if (showByScroll && isMobile) {
        fixedBottomCta.style.bottom = '0';
      } else {
        fixedBottomCta.style.bottom = '-100%';
      }
    }
  }

  function setRandomDatesToElements() {
    var $dateElements = $('.testimonial-date-grid');
    var elementCount = $dateElements.length;

    if (elementCount === 0) return;
    if (elementCount !== 3 && elementCount !== 6) return;

    var currentDate = new Date();
    var dates = [];
    var usedDates = new Set();

    while (dates.length < elementCount) {
      var randomDays = Math.floor(Math.random() * 23) + 3;
      var randomDate = new Date(currentDate.getTime() - randomDays * 24 * 60 * 60 * 1000);
      var dateKey = randomDate.toISOString().split('T')[0];

      if (!usedDates.has(dateKey)) {
        usedDates.add(dateKey);
        dates.push(randomDate);
      }
    }

    dates.sort(function (a, b) { return a - b; });

    dates.forEach(function (date, index) {
      var formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });
      $dateElements.eq(index).text(formattedDate);
    });
  }

  // ── Template values ──
  var discountValue = $('body').data('discount');
  if ($('.discount-offer-template').length) {
    $('.discount-offer-template').html(discountValue + '%');
  }

  var daysGuarantee = $('body').data('days-guarantee');
  if ($('.guaranteed-days-offer').length) {
    $('.guaranteed-days-offer').html(daysGuarantee + '-Day');
  }
  if ($('.guaranteed-days-offer2').length) {
    $('.guaranteed-days-offer2').html(daysGuarantee + ' Day');
  }
  if ($('.guaranteed-days-offer3').length) {
    $('.guaranteed-days-offer3').html(daysGuarantee);
  }

  var daysTrail = $('body').data('days-trail');
  if ($('.guaranteed-days-offer4').length) {
    $('.guaranteed-days-offer4').html(daysTrail + '-day');
  }
  if ($('.guaranteed-days-offer5').length) {
    $('.guaranteed-days-offer5').html(daysTrail + ' days');
  }

  var currentYear = new Date().getFullYear();
  if ($('.copyright-year').length) {
    $('.copyright-year').html(currentYear);
  }

  function mainAccordion() {
    var isAnimating = false;

    $('.accordion-btn').on('click', function () {
      if (isAnimating) return;

      var $this = $(this);
      var $content = $this.next('.accordion-content');
      var $arrow = $this.find('.arrow-icon');
      var isActive = $content.is(':visible');
      var scrollOffset = 100;

      isAnimating = true;

      // Close clicked accordion if already open
      if (isActive) {
        $content.slideUp(300).animate({ opacity: 0 }, 300, function () {
          isAnimating = false;
        });
        $arrow.css('transform', 'rotate(0deg)');
        return;
      }

      // Close all other accordions
      $('.accordion-content').not($content).slideUp(300, function () {
        $(this).css('opacity', 0);
      });
      $('.arrow-icon').not($arrow).css('transform', 'rotate(0deg)');

      // Open clicked accordion after a short delay
      setTimeout(function () {
        $content.css('opacity', 0).slideDown(400, function () {
          $(this).animate({ opacity: 1 }, 200, function () {
            isAnimating = false;
          });
        });

        $arrow.css('transform', 'rotate(180deg)');

        // Scroll to accordion
        $('html, body').animate({
          scrollTop: $this.offset().top - scrollOffset
        }, 500);
      }, 300);
    });
  }


  function updateShipDate() {
    if ($(".date-to-ship").length) {
      var today = new Date();
      var tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var dayName = dayNames[tomorrow.getDay()];
      var dateNum = tomorrow.getDate();

      var suffix;
      if (dateNum > 3 && dateNum < 21) {
        suffix = "th";
      } else {
        switch (dateNum % 10) {
          case 1: suffix = "st"; break;
          case 2: suffix = "nd"; break;
          case 3: suffix = "rd"; break;
          default: suffix = "th";
        }
      }

      var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var monthName = monthNames[tomorrow.getMonth()];
      var formattedDate = dayName + " " + dateNum + suffix + " " + monthName;

      $(".date-to-ship").text(formattedDate);
    }
  }
  function updateShippingCountdown() {
    if ($(".shipping-remaining-time").length) {
      // Gets current time in USER'S LOCAL TIMEZONE
      var now = new Date();
      var currentHour = now.getHours();

      var cutoffTime = new Date();

      // Determine the next cutoff time based on current time
      if (currentHour >= 0 && currentHour < 12) {
        // Between 12 AM - 12 PM: Order by 12 PM (noon) today
        cutoffTime.setHours(12, 0, 0, 0);
      }
      else if (currentHour >= 12 && currentHour < 18) {
        // Between 12 PM - 6 PM: Order by 6 PM today
        cutoffTime.setHours(18, 0, 0, 0);
      }
      else {
        // Between 6 PM - 12 AM: Order by 12 AM (midnight) next day
        cutoffTime.setHours(24, 0, 0, 0);
      }

      var diff = cutoffTime - now;

      if (diff <= 0) {
        $(".shipping-remaining-time").text("00 Hours 00 Minutes");
        return;
      }

      var hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      var minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      var hoursFormatted = hoursLeft.toString().padStart(2, '0');
      var minutesFormatted = minutesLeft.toString().padStart(2, '0');

      $(".shipping-remaining-time").text(hoursFormatted + " Hours " + minutesFormatted + " Minutes");
    }
  }


  function updateMinusButtonState() {
    var value = parseInt($('.quantity').first().text().trim()) || 1;

    if (value <= 1) {
      $('.minus-btn').css('opacity', '0.25');
    } else {
      $('.minus-btn').css('opacity', '1');
    }
  }

  function colorModesChanging(){
    const colorData = {
    red: {
      subtitle: "RED LIGHT — 630NM",
      title: "The Age Reverser",
      description: "Boosts collagen to visibly reduce fine lines and wrinkles—reviving your skin's youthful glow.",
      titleColor: "#FF4C31",
      subtitleColor: "#FFA699"
    },
    yellow: {
      subtitle: "YELLOW LIGHT — 590NM",
      title: "Calm & Comfort",
      description: "Soothes sensitive skin, reduces redness, and helps with rosacea, flushing, and broken capillaries.",
      titleColor: "#FFDC5C",
      subtitleColor: "#FFF2C2"
    },
    green: {
      subtitle: "GREEN LIGHT — 520NM",
      title: "Complexion Corrector",
      description: "Fades dark spots, melasma, and sun-induced discoloration for a more even, radiant skin tone.",
      titleColor: "#65ED75",
      subtitleColor: "#BFF8C6"
    },
    blue: {
      subtitle: "BLUE LIGHT — 470NM",
      title: "Brighten & Tighten",
      description: "Energizes the skin from within, speeding up renewal for a luminous, firmer appearance.",
      titleColor: "#13DDEF",
      subtitleColor: "#A4F2F9"
    },
    purple: {
      subtitle: "PURPLE LIGHT — 600NM",
      title: "Repair & Renew Duo",
      description: "Combines red and blue light for the best of both worlds: acne control and deep skin rejuvenation.",
      titleColor: "#AB66EA",
      subtitleColor: "#DDC0F6"
    },
    white: {
      subtitle: "WHITE LIGHT — FULL SPECTRUM",
      title: "Energize & Illuminate",
      description: "A full-spectrum boost that stimulates overall skin vitality—supporting renewal and a healthy glow.",
      titleColor: "#FFFFFF",
      subtitleColor: "#B3B3B3"
    }
  };
  // Handle color button clicks
  $('.color-btn').click(function() {
    const selectedColor = $(this).data('color');
    $('.color-btn').removeClass('active');
    $(this).addClass('active');
    $('[id$="-image"]').css('opacity', 0);
    $(`#${selectedColor}-image`).css('opacity', 1);
    const data = colorData[selectedColor];
    $('#subtitle').text(data.subtitle);
    $('#title').text(data.title).css('color', data.titleColor);
    $('#subtitle').text(data.subtitle).css('color', data.subtitleColor);
    $('#description').text(data.description);
  });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BOOT: Initialize everything
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  updateMinusButtonState();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Event Handlers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $(document).on('click', '.plus-btn', function (e) {
    e.stopPropagation();
    e.preventDefault();

    var currentValue = parseInt($('.quantity').first().text().trim()) || 0;
    var newValue = currentValue + 1;

    // Update ALL quantity elements on the page
    $('.quantity').text(newValue);

    updateMinusButtonState();
  });

  $(document).on('click', '.minus-btn', function (e) {
    e.stopPropagation();
    e.preventDefault();

    var currentValue = parseInt($('.quantity').first().text().trim()) || 0;

    if (currentValue > 1) {
      var newValue = currentValue - 1;

      // Update ALL quantity elements on the page
      $('.quantity').text(newValue);

      updateMinusButtonState();
    }
  });


  $(document).ready(function () {
    $('.sticky-bottom').hide();

    var isVisible = false;

    function updateStickyBottom() {
      var heroSection = $('#hero-section');
      var limitedSection = $('#limited-section');
      var stickyBottom = $('.sticky-bottom');

      if (!heroSection.length || !limitedSection.length) return;

      var scrollPos = $(window).scrollTop();
      var heroEnd = heroSection.offset().top + heroSection.outerHeight();
      var limitedTop = limitedSection.offset().top;

      // Add offset to hide sticky before limited section (e.g., 200px before)
      var hideOffset = 200;

      // Show after hero, hide before limited section
      var shouldShow = scrollPos > heroEnd && scrollPos < (limitedTop - hideOffset);

      if (shouldShow && !isVisible) {
        stickyBottom.stop(true, true).slideDown(300);
        isVisible = true;
      } else if (!shouldShow && isVisible) {
        stickyBottom.stop(true, true).slideUp(300);
        isVisible = false;
      }
    }

    $(window).on('scroll resize', function () {
      updateStickyBottom();
    });

    updateStickyBottom();
  });

  function reviewTabSlider() {
    if ($('.testimonial-slider-container').length) {
      // Initialize Swiper
      const swiper = new Swiper('.testimonialSwiper', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
          delay: 5000,
          disableOnInteraction: false,
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        breakpoints: {
          640: {
            slidesPerView: 1,
          },
          768: {
            slidesPerView: 1,
          },
          1024: {
            slidesPerView: 1,
          },
        },
      });
    }
  }

  function HeroSlider() {
    const totalSlides = 8;

    /* ---- MOBILE SLIDER (touch + mouse drag) ---- */
let mCurrent = 0;
let touchStartX = 0;
let mouseStartX = 0;
let isDragging = false;

// Touch events
$('#mSliderWrapper').on('touchstart', function (e) {
  touchStartX = e.originalEvent.touches[0].clientX;
});
$('#mSliderWrapper').on('touchend', function (e) {
  const diff = touchStartX - e.originalEvent.changedTouches[0].clientX;
  if (Math.abs(diff) > 40) {
    mGoTo(diff > 0 ? mCurrent + 1 : mCurrent - 1);
  }
});

// Mouse drag events
$('#mSliderWrapper').on('mousedown', function (e) {
  isDragging = true;
  mouseStartX = e.clientX;
  e.preventDefault(); // prevents text selection while dragging
});
$(document).on('mouseup', function (e) {
  if (!isDragging) return;
  isDragging = false;
  const diff = mouseStartX - e.clientX;
  if (Math.abs(diff) > 40) {
    mGoTo(diff > 0 ? mCurrent + 1 : mCurrent - 1);
  }
});
// Cancel drag if mouse leaves window
$(document).on('mouseleave', function () {
  isDragging = false;
});


    function mGoTo(index) {
      mCurrent = Math.max(0, Math.min(index, totalSlides - 1));
      const fillPct = ((mCurrent + 1) / totalSlides) * 100;
      $('#mSliderTrack').css('transform', `translateX(-${mCurrent * 100}%)`);
      $('#mProgressLine').css('width', fillPct + '%');
    }

    $('#mSliderWrapper').on('touchstart', function (e) {
      touchStartX = e.originalEvent.touches[0].clientX;
    });
    $('#mSliderWrapper').on('touchend', function (e) {
      const diff = touchStartX - e.originalEvent.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        mGoTo(diff > 0 ? mCurrent + 1 : mCurrent - 1);
      }
    });

   
    $('.accordion-toggle').on('click', function () {
      const targetId = $(this).data('target');
      const $body = $('#' + targetId);
      const $btn = $(this);
      const isOpen = $body.hasClass('open');

      // Close all
      $('.accordion-body').each(function () {
        if ($(this).hasClass('open')) {
          $(this).slideUp(250).removeClass('open');
        }
      });
      // Reset all button labels to closed state
      $('.accordion-toggle').each(function () {
        $(this).find('.open-icon').addClass('hidden');
        $(this).find('.closed-icon').removeClass('hidden');
        $(this).find('span:first').removeClass('font-semibold').addClass('font-normal');
      });

      // If it was closed, open it
      if (!isOpen) {
        $body.slideDown(250).addClass('open');
        $btn.find('.open-icon').removeClass('hidden');
        $btn.find('.closed-icon').addClass('hidden');
        $btn.find('span:first').removeClass('font-normal').addClass('font-semibold');
      }
    });

  }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BOOT: Initialize everything
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  reviewTabSlider();
  $('.quantity').each(function () {
    updateMinusButtonState($(this).parent());
  });
  updateShippingCountdown();
  setInterval(updateShippingCountdown, 60000); // Update every minute

  updateShipDate();
  // Overlay (must init controls BEFORE productGallery so openGalleryOverlay is available)
  initOverlayControls();
  initOverlayTabs();

  // Initialize overlay swipers after a small delay to ensure DOM is ready
  setTimeout(function () {
    initOverlayImageSwipers();
    initOverlayVideoSwipers();
    initOverlayVideoPlayback();
  }, 100);

  // Page-level
  colorModesChanging();
  HeroSlider();
  mainAccordion();
  updateLogoSources();
  setRandomDatesToElements();
  checkMobile();
  HeroScript();
  updateAfflinksLinksOutbound();
  updateHeroAfterHeight();
  updateShippingDate();
  InitializeFAQ();
  initializeCountdown();
  // disableClick();

  $(window).on('resize', function () {
    checkMobile();
    updateLogoSources();
    updateHeroAfterHeight();
  });
});
