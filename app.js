/**
 * US Traffic Accident Analysis - Presentation Application
 * Self-contained JavaScript for GitHub Pages deployment
 * 
 * Includes:
 * - SlideScaler: Auto-fit content to viewport
 * - SlideEngine: Navigation and transitions
 * - ChartFactory: Chart.js integration with brand styling
 * - Timeline renderer
 * - Animation triggers
 */

/* ============================================
   SLIDE SCALER - Auto-fit content to viewport
   ============================================ */
class SlideScaler {
    constructor() {
        this.slides = [];
        this.scaledSlides = new Map();
    }

    init() {
        this.slides = Array.from(document.querySelectorAll('.slide'));

        // Wrap slide content for scaling (exclude bg-image, bg-overlay, slide-footer)
        this.slides.forEach(slide => {
            this.wrapSlideContent(slide);
        });

        // Initial scale calculation
        this.updateAllScales();

        // Recalculate on resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateAllScales(), 100);
        });

        console.log('SlideScaler initialized');
    }

    wrapSlideContent(slide) {
        // Skip if already wrapped
        if (slide.querySelector('.slide-content-wrapper')) return;

        // Get all children except background elements, footer, header, and contact-footer
        // These excluded elements should stay as direct children of the slide
        const contentElements = Array.from(slide.children).filter(child => {
            return !child.classList.contains('bg-image') &&
                !child.classList.contains('bg-overlay') &&
                !child.classList.contains('slide-footer') &&
                !child.classList.contains('slide-header') &&
                !child.classList.contains('contact-footer');
        });

        if (contentElements.length === 0) return;

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'slide-content-wrapper';

        // Copy alignment from slide to wrapper for title slides
        if (slide.classList.contains('slide-title')) {
            wrapper.classList.add('slide-content-wrapper--centered');
        }

        // Find the first content element to know where to insert the wrapper
        const firstContentElement = contentElements[0];
        const insertBeforeElement = firstContentElement;

        // Insert wrapper at the position of the first content element
        slide.insertBefore(wrapper, insertBeforeElement);

        // Move content elements into wrapper (maintaining their order)
        contentElements.forEach(el => {
            wrapper.appendChild(el);
        });

        this.scaledSlides.set(slide, wrapper);
    }

    updateAllScales() {
        const viewportHeight = window.innerHeight;
        const slidePadding = 60; // --slide-padding value
        const footerHeight = 40; // approximate footer height with margin

        this.scaledSlides.forEach((wrapper, slide) => {
            this.updateSlideScale(slide, wrapper, viewportHeight, slidePadding, footerHeight);
        });
    }

    updateSlideScale(slide, wrapper, viewportHeight, slidePadding, footerHeight) {
        // Temporarily reset scale to measure natural height
        wrapper.style.transform = 'none';

        // Get natural content height
        const contentHeight = wrapper.scrollHeight;

        // Calculate available height (viewport - padding - footer space)
        const hasFooter = slide.querySelector('.slide-footer') !== null;
        const reservedSpace = slidePadding + (hasFooter ? footerHeight : 0);
        const availableHeight = viewportHeight - reservedSpace;

        // Calculate scale (max 1, don't zoom in)
        let scale = 1;
        if (contentHeight > availableHeight && contentHeight > 0) {
            scale = availableHeight / contentHeight;
            // Minimum scale of 0.6 to keep things readable
            scale = Math.max(0.6, scale);
        }

        // Apply scale
        if (scale < 1) {
            wrapper.style.transform = `scale(${scale})`;
            // Adjust wrapper height to account for scaling
            wrapper.style.height = `${contentHeight}px`;
        } else {
            wrapper.style.transform = 'none';
            wrapper.style.height = 'auto';
        }
    }
}

/* ============================================
   SLIDE ENGINE
   ============================================ */
class SlideEngine {
    constructor(config = {}) {
        this.config = {
            navigation: {
                keyboard: true,
                touch: true,
                mouse: false,
                loop: false,
                ...config.navigation
            },
            progress: {
                type: 'bar',
                position: 'bottom',
                ...config.progress
            },
            transitions: {
                type: 'fade',
                duration: 400,
                easing: 'ease-out',
                ...config.transitions
            },
            animations: {
                enabled: true,
                staggerDelay: 100,
                countUpDuration: 2000,
                ...config.animations
            },
            ...config
        };

        this.currentSlide = 0;
        this.slides = [];
        this.isTransitioning = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
    }

    init() {
        this.slides = Array.from(document.querySelectorAll('.slide'));

        if (this.slides.length === 0) {
            console.warn('SlideEngine: No slides found.');
            return;
        }

        // Set up initial state
        this.slides.forEach((slide, index) => {
            slide.dataset.slideIndex = index;
            if (index !== 0) {
                slide.classList.add('slide-hidden');
                slide.setAttribute('aria-hidden', 'true');
            } else {
                slide.setAttribute('aria-hidden', 'false');
            }

            // Hide all animated elements initially
            slide.querySelectorAll('[data-animate]').forEach(el => {
                el.classList.add('animate-hidden');
            });
        });

        // Show first slide (already visible via CSS, but ensure state is correct)
        this.goToSlide(0, false);

        // Bind navigation
        if (this.config.navigation.keyboard) this.bindKeyboard();
        if (this.config.navigation.touch) this.bindTouch();
        if (this.config.navigation.mouse) this.bindMouse();

        // Bind edge navigation controls
        this.bindEdgeControls();
        this.bindCarouselControls();

        // Update progress
        this.updateProgress();

        // Update navigation controls on init
        this.updateNavigationControls();

        console.log(`SlideEngine initialized with ${this.slides.length} slides`);
    }

    goToSlide(index, animate = true) {
        // If already transitioning to the same slide, ignore
        if (this.isTransitioning && index === this.currentSlide) {
            return;
        }

        // If already transitioning, cancel current transition and proceed
        if (this.isTransitioning) {
            if (this.lineAnimator) {
                this.lineAnimator.cancelTimelineAnimation();
                // Cancel all line animations
                if (this.lineAnimator.cancelSlide10To11Swoop) {
                    this.lineAnimator.cancelSlide10To11Swoop();
                }
                if (this.lineAnimator.cancelSlide12Split) {
                    this.lineAnimator.cancelSlide12Split();
                }
                if (this.lineAnimator.cancelSlide12Expansion) {
                    this.lineAnimator.cancelSlide12Expansion();
                }
            }
            // Force reset any stuck slides
            this.slides.forEach((slide, i) => {
                if (i !== this.currentSlide && i !== index) {
                    slide.classList.add('slide-hidden');
                    slide.setAttribute('aria-hidden', 'true');
                }
            });
            this.isTransitioning = false;
        }

        // Bounds check
        if (index < 0) {
            index = this.config.navigation.loop ? this.slides.length - 1 : 0;
        } else if (index >= this.slides.length) {
            index = this.config.navigation.loop ? 0 : this.slides.length - 1;
        }

        if (index === this.currentSlide && animate) return;

        const prevSlide = this.slides[this.currentSlide];
        const nextSlide = this.slides[index];
        const direction = index > this.currentSlide ? 'forward' : 'backward';

        // On initial load, if going to slide 0 and currentSlide is also 0, ensure it's visible
        if (index === 0 && this.currentSlide === 0 && !animate) {
            nextSlide.classList.remove('slide-hidden');
            nextSlide.setAttribute('aria-hidden', 'false');
            if (this.lineAnimator) {
                this.lineAnimator.updatePath(0, false);
            }
            this.afterSlideChange(0);
            return;
        }

        // Reset animations on the slide we're leaving
        if (prevSlide !== nextSlide) {
            this.resetSlideAnimations(prevSlide);

            // If leaving slide 12, always reset wipe-overlays
            if (this.currentSlide === 11 && this.lineAnimator) {
                if (this.lineAnimator.cancelSlide12Split) {
                    this.lineAnimator.cancelSlide12Split();
                }
                if (this.lineAnimator.cancelSlide12Expansion) {
                    this.lineAnimator.cancelSlide12Expansion();
                }
            }
        }

        // Special handling for slide 2 to 3 transition (swoop animation)
        if (animate && this.lineAnimator && this.currentSlide === 1 && index === 2) {
            this.isTransitioning = true;

            this.lineAnimator.animateSwoopTransition(prevSlide, nextSlide, () => {
                // Trigger slide transition after line swoop starts
                if (this.config.animations.enabled) {
                    this.triggerSlideAnimations(nextSlide);
                }

                this.transition(prevSlide, nextSlide, direction).then(() => {
                    this.isTransitioning = false;
                    this.afterSlideChange(index, true);
                });
            });

            this.currentSlide = index;
            return;
        }

        // Special handling for slide 3 to 2 transition (reverse swoop)
        if (animate && this.lineAnimator && this.currentSlide === 2 && index === 1) {
            this.isTransitioning = true;

            this.lineAnimator.animateReverseSwoopTransition(prevSlide, nextSlide, () => {
                if (this.config.animations.enabled) {
                    this.triggerSlideAnimations(nextSlide);
                }

                this.transition(prevSlide, nextSlide, direction).then(() => {
                    this.isTransitioning = false;
                    this.afterSlideChange(index, true);
                });
            });

            this.currentSlide = index;
            return;
        }

        // Special handling for slide 10 to 11 transition (swoop from bottom line)
        if (animate && this.lineAnimator && this.currentSlide === 9 && index === 10) {
            this.isTransitioning = true;

            this.lineAnimator.cancelTimelineAnimation();
            this.lineAnimator.showAllTimelineCircles();

            this.lineAnimator.animateSlide10To11Swoop(() => {
                if (this.config.animations.enabled) {
                    this.triggerSlideAnimations(nextSlide);
                }

                this.transition(prevSlide, nextSlide, direction).then(() => {
                    this.isTransitioning = false;
                    this.afterSlideChange(index, true);
                });
            });

            this.currentSlide = index;
            return;
        }

        // Special handling for slide 12 to 11 transition (reverse - shrink and move up)
        if (animate && this.lineAnimator && this.currentSlide === 11 && index === 10) {
            this.isTransitioning = true;

            // Don't cancel split here - let the reverse animation handle it
            // Just clear timeouts to prevent conflicts
            this.lineAnimator.slide12SplitTimeouts.forEach(id => clearTimeout(id));
            this.lineAnimator.slide12SplitTimeouts = [];

            this.lineAnimator.animateSlide12To11Reverse(() => {
                if (this.config.animations.enabled) {
                    this.triggerSlideAnimations(nextSlide);
                }

                this.transition(prevSlide, nextSlide, direction).then(() => {
                    this.isTransitioning = false;
                    // Reset overlays after transition completes
                    if (this.lineAnimator.overlayTop) {
                        this.lineAnimator.overlayTop.style.transition = 'none';
                        this.lineAnimator.overlayTop.style.height = '0';
                        this.lineAnimator.overlayTop.style.top = '0';
                        this.lineAnimator.overlayTop.style.opacity = '0';
                        this.lineAnimator.overlayTop.style.display = 'none';
                    }
                    if (this.lineAnimator.overlayBottom) {
                        this.lineAnimator.overlayBottom.style.transition = 'none';
                        this.lineAnimator.overlayBottom.style.height = '0';
                        this.lineAnimator.overlayBottom.style.bottom = '0';
                        this.lineAnimator.overlayBottom.style.opacity = '0';
                        this.lineAnimator.overlayBottom.style.display = 'none';
                    }
                    this.afterSlideChange(index, true);
                });
            });

            this.currentSlide = index;
            return;
        }

        // Special handling for slide 11 to 12 transition (split animation with wipe reveal)
        console.log('goToSlide check - currentSlide:', this.currentSlide, 'index:', index, 'animate:', animate, 'lineAnimator:', !!this.lineAnimator);
        if (animate && this.lineAnimator && this.currentSlide === 10 && index === 11) {
            console.log('Triggering slide 11 to 12 split animation');

            // Cancel any ongoing animations first - including slide 10->11 swoop
            this.lineAnimator.cancelTimelineAnimation();
            if (this.lineAnimator.cancelSlide10To11Swoop) {
                this.lineAnimator.cancelSlide10To11Swoop();
            }
            if (this.lineAnimator.cancelSlide12Split) {
                this.lineAnimator.cancelSlide12Split();
            }
            if (this.lineAnimator.cancelSlide12Expansion) {
                this.lineAnimator.cancelSlide12Expansion();
            }

            // Reset any ongoing transition state
            if (this.isTransitioning) {
                // Force complete any stuck transition
                prevSlide.classList.add('slide-hidden');
                prevSlide.setAttribute('aria-hidden', 'true');
                this.isTransitioning = false;
            }

            // Force reset isAnimating to allow slide 12 animation to start
            this.lineAnimator.isAnimating = false;

            this.isTransitioning = true;

            this.lineAnimator.animateSlide11To12Split(
                // onSlideReady - called immediately to show the slide
                () => {
                    // Ensure transition only runs once
                    if (this.currentSlide === index) {
                        this.isTransitioning = false;
                        return;
                    }

                    this.transition(prevSlide, nextSlide, direction).then(() => {
                        this.isTransitioning = false;
                        this.currentSlide = index;
                        this.afterSlideChange(index, true);
                    }).catch((error) => {
                        console.error('Transition error:', error);
                        this.isTransitioning = false;
                        this.currentSlide = index;
                        // Force slide visibility
                        prevSlide.classList.add('slide-hidden');
                        prevSlide.setAttribute('aria-hidden', 'true');
                        nextSlide.classList.remove('slide-hidden');
                        nextSlide.setAttribute('aria-hidden', 'false');
                        this.afterSlideChange(index, true);
                    });
                },
                // onContentReady - called after lines are in place
                () => {
                    if (this.config.animations.enabled) {
                        this.triggerSlideAnimations(nextSlide);
                    }
                }
            );

            // Don't set currentSlide here - wait for transition to complete
            return;
        }

        if (animate && this.config.transitions.type !== 'none') {
            this.isTransitioning = true;

            // Update line animator for standard transitions
            if (this.lineAnimator) {
                this.lineAnimator.updatePath(index, true);
            }

            // Trigger element animations immediately when transition starts
            if (this.config.animations.enabled) {
                this.triggerSlideAnimations(nextSlide);
            }

            this.transition(prevSlide, nextSlide, direction).then(() => {
                this.isTransitioning = false;
                this.afterSlideChange(index, true);
            });
        } else {
            if (prevSlide && prevSlide !== nextSlide) {
                prevSlide.classList.add('slide-hidden');
                prevSlide.setAttribute('aria-hidden', 'true');
            }
            nextSlide.classList.remove('slide-hidden');
            nextSlide.setAttribute('aria-hidden', 'false');

            // Hide/show navigation controls based on slide position
            this.updateNavigationControls();

            // Update line animator without animation for non-animated transitions
            if (this.lineAnimator) {
                this.lineAnimator.updatePath(index, false);
            }

            this.afterSlideChange(index);
        }

        this.currentSlide = index;
    }

    afterSlideChange(index, animationsAlreadyTriggered = false) {
        this.currentSlide = index;
        this.updateProgress();
        this.updateNavigationControls();
        this.updateCarouselThumbnails();

        if (this.config.animations.enabled && !animationsAlreadyTriggered) {
            this.triggerSlideAnimations(this.slides[index]);
        }

        // Dispatch custom event for chart initialization
        document.dispatchEvent(new CustomEvent('slidechange', {
            detail: { current: index, slide: this.slides[index] }
        }));
    }

    transition(fromSlide, toSlide, direction) {
        return new Promise((resolve) => {
            const duration = this.config.transitions.duration;
            const easing = this.config.transitions.easing;
            const type = this.config.transitions.type;

            toSlide.classList.remove('slide-hidden');
            toSlide.setAttribute('aria-hidden', 'false');

            // Safety timeout to ensure promise always resolves
            const safetyTimeout = setTimeout(() => {
                resolve();
            }, duration + 500);

            switch (type) {
                case 'fade':
                    fromSlide.style.transition = `opacity ${duration}ms ${easing}`;
                    toSlide.style.transition = `opacity ${duration}ms ${easing}`;
                    fromSlide.style.opacity = '0';
                    toSlide.style.opacity = '1';
                    break;

                case 'slide':
                    const translateFrom = direction === 'forward' ? '-100%' : '100%';
                    const translateTo = direction === 'forward' ? '100%' : '-100%';
                    fromSlide.style.transition = `transform ${duration}ms ${easing}`;
                    toSlide.style.transition = `transform ${duration}ms ${easing}`;
                    toSlide.style.transform = `translateX(${translateTo})`;
                    requestAnimationFrame(() => {
                        fromSlide.style.transform = `translateX(${translateFrom})`;
                        toSlide.style.transform = 'translateX(0)';
                    });
                    break;

                case 'zoom':
                    fromSlide.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
                    toSlide.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
                    toSlide.style.transform = 'scale(0.8)';
                    toSlide.style.opacity = '0';
                    requestAnimationFrame(() => {
                        fromSlide.style.transform = 'scale(1.2)';
                        fromSlide.style.opacity = '0';
                        toSlide.style.transform = 'scale(1)';
                        toSlide.style.opacity = '1';
                    });
                    break;
            }

            setTimeout(() => {
                clearTimeout(safetyTimeout);
                fromSlide.classList.add('slide-hidden');
                fromSlide.setAttribute('aria-hidden', 'true');
                fromSlide.style.transition = '';
                fromSlide.style.transform = '';
                fromSlide.style.opacity = '';
                toSlide.style.transition = '';
                toSlide.style.transform = '';
                resolve();
            }, duration);
        });
    }

    resetSlideAnimations(slide) {
        const animatedElements = slide.querySelectorAll('[data-animate]');
        animatedElements.forEach(el => {
            el.classList.remove('animate-in');
            el.classList.add('animate-hidden');
        });
    }

    triggerSlideAnimations(slide) {
        const animatedElements = slide.querySelectorAll('[data-animate]');
        animatedElements.forEach((el, index) => {
            const customDelay = parseInt(el.dataset.delay || '0', 10);
            const staggerDelay = index * this.config.animations.staggerDelay;
            const totalDelay = customDelay + staggerDelay;

            setTimeout(() => {
                el.classList.remove('animate-hidden');
                el.classList.add('animate-in');
            }, totalDelay);
        });

        // CountUp numbers
        const countUpElements = slide.querySelectorAll('[data-countup]');
        countUpElements.forEach(el => {
            const target = parseInt(el.dataset.countup, 10);
            this.animateCountUp(el, target);
        });
    }

    animateCountUp(element, target) {
        const duration = this.config.animations.countUpDuration;
        const start = 0;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeProgress);

            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    next() {
        this.goToSlide(this.currentSlide + 1);
    }

    prev() {
        this.goToSlide(this.currentSlide - 1);
    }

    first() {
        this.goToSlide(0);
    }

    last() {
        this.goToSlide(this.slides.length - 1);
    }

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    this.next();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    this.prev();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.first();
                    break;
                case 'End':
                    e.preventDefault();
                    this.last();
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
            }
        });
    }

    bindTouch() {
        const container = document.querySelector('.presentation') || document.body;

        container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        const diff = this.touchStartX - this.touchEndX;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.next();
            } else {
                this.prev();
            }
        }
    }

    bindMouse() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('a, button, input, [data-no-advance]')) return;

            const screenWidth = window.innerWidth;
            if (e.clientX > screenWidth / 2) {
                this.next();
            } else {
                this.prev();
            }
        });
    }

    bindEdgeControls() {
        const leftControl = document.getElementById('nav-control-left');
        const rightControl = document.getElementById('nav-control-right');
        const topControl = document.getElementById('nav-control-top');

        if (!leftControl || !rightControl || !topControl) {
            console.warn('Edge navigation controls not found');
            return;
        }

        const edgeThreshold = 80; // pixels from edge to trigger
        const topThreshold = 60; // pixels from top to trigger

        // Mouse move handler for edge detection
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Left edge
            if (x <= edgeThreshold) {
                leftControl.classList.add('visible');
            } else {
                leftControl.classList.remove('visible');
            }

            // Right edge
            if (x >= width - edgeThreshold) {
                rightControl.classList.add('visible');
            } else {
                rightControl.classList.remove('visible');
            }

            // Top edge
            if (y <= topThreshold) {
                topControl.classList.add('visible');
            } else {
                topControl.classList.remove('visible');
            }
        });

        // Hide controls when mouse leaves viewport
        document.addEventListener('mouseleave', () => {
            leftControl.classList.remove('visible');
            rightControl.classList.remove('visible');
            topControl.classList.remove('visible');
        });

        // Click handlers
        leftControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.prev();
        });

        rightControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.next();
        });

        topControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.first();
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen not available:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    updateProgress() {
        // Progress is now handled by LineAnimator
        // This method is kept for compatibility and potential future use
    }

    bindCarouselControls() {
        const carouselContainer = document.getElementById('nav-carousel-container');
        const carouselTab = document.getElementById('nav-carousel-tab');
        const thumbnailsContainer = document.getElementById('nav-carousel-thumbnails');

        if (!carouselContainer || !carouselTab || !thumbnailsContainer) return;

        // Generate thumbnails with image paths
        this.generateThumbnails();

        let hoverTimeout = null;

        // Show carousel on hover
        const showCarousel = () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            carouselContainer.classList.add('hovered');
            document.body.classList.add('carousel-hovered');
        };

        // Hide carousel after delay
        const hideCarousel = () => {
            hoverTimeout = setTimeout(() => {
                carouselContainer.classList.remove('hovered');
                document.body.classList.remove('carousel-hovered');
            }, 300);
        };

        // Add hover listeners to container and tab
        carouselContainer.addEventListener('mouseenter', showCarousel);
        carouselContainer.addEventListener('mouseleave', hideCarousel);
        carouselTab.addEventListener('mouseenter', showCarousel);

        // Update active thumbnail when slide changes
        this.updateCarouselThumbnails();
    }

    generateThumbnails() {
        const thumbnailsContainer = document.getElementById('nav-carousel-thumbnails');
        if (!thumbnailsContainer) return;

        // Get all slides
        const slides = Array.from(document.querySelectorAll('.slide'));

        if (slides.length === 0) {
            console.warn('No slides found for thumbnail generation');
            return;
        }

        // Thumbnail image paths - update these with your screenshot paths
        // Format: 'assets/thumbnails/slide-1.jpg' or similar
        const thumbnailPaths = [
            'assets/thumbnails/slide-1.jpg',  // Slide 1
            'assets/thumbnails/slide-2.jpg',  // Slide 2
            'assets/thumbnails/slide-3.jpg',  // Slide 3
            'assets/thumbnails/slide-4.jpg',  // Slide 4
            'assets/thumbnails/slide-5.jpg',  // Slide 5
            'assets/thumbnails/slide-6.jpg',  // Slide 6
            'assets/thumbnails/slide-7.jpg',  // Slide 7
            'assets/thumbnails/slide-8.jpg',  // Slide 8
            'assets/thumbnails/slide-9.jpg',  // Slide 9
            'assets/thumbnails/slide-10.jpg', // Slide 10
            'assets/thumbnails/slide-11.jpg', // Slide 11
            'assets/thumbnails/slide-12.jpg'  // Slide 12
        ];

        thumbnailsContainer.innerHTML = '';

        slides.forEach((slide, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'nav-carousel-thumbnail';
            thumbnail.dataset.slideIndex = index;
            thumbnail.setAttribute('aria-label', `Go to slide ${index + 1}`);

            // Create thumbnail image if path exists
            const imagePath = thumbnailPaths[index];
            if (imagePath) {
                const img = document.createElement('img');
                img.className = 'nav-carousel-thumbnail-image';
                img.src = imagePath;
                img.alt = `Slide ${index + 1} thumbnail`;
                img.onerror = () => {
                    // If image fails to load, show placeholder
                    const placeholder = document.createElement('div');
                    placeholder.className = 'nav-carousel-thumbnail-placeholder';
                    placeholder.textContent = index + 1;
                    thumbnail.appendChild(placeholder);
                };
                thumbnail.appendChild(img);
            } else {
                // Fallback placeholder if no image
                const placeholder = document.createElement('div');
                placeholder.className = 'nav-carousel-thumbnail-placeholder';
                placeholder.textContent = index + 1;
                thumbnail.appendChild(placeholder);
            }

            // Create thumbnail number badge
            const numberBadge = document.createElement('div');
            numberBadge.className = 'nav-carousel-thumbnail-number';
            numberBadge.textContent = index + 1;
            thumbnail.appendChild(numberBadge);

            // Get slide title for thumbnail label
            let slideTitle = `Slide ${index + 1}`;

            // Manual override for specific slides
            if (index === 1) {
                slideTitle = 'Total Accident Records';
            } else {
                const slideTitleElement = slide.querySelector('.slide-title-text');
                if (slideTitleElement) {
                    slideTitle = slideTitleElement.textContent.trim();
                    // Truncate long titles
                    if (slideTitle.length > 25) {
                        slideTitle = slideTitle.substring(0, 22) + '...';
                    }
                }
            }

            // Create thumbnail title
            const thumbnailTitle = document.createElement('div');
            thumbnailTitle.className = 'nav-carousel-thumbnail-title';
            thumbnailTitle.textContent = slideTitle;
            thumbnail.appendChild(thumbnailTitle);

            // Add click handler
            thumbnail.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.goToSlide(index);
            });

            // Stagger animation delay
            thumbnail.style.transitionDelay = `${index * 0.02}s`;

            thumbnailsContainer.appendChild(thumbnail);
        });
    }

    updateCarouselThumbnails() {
        const thumbnails = document.querySelectorAll('.nav-carousel-thumbnail');
        thumbnails.forEach((thumb, index) => {
            if (index === this.currentSlide) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }


    updateNavigationControls() {
        const leftControl = document.getElementById('nav-control-left');
        const rightControl = document.getElementById('nav-control-right');

        // Hide left arrow on first slide
        if (leftControl) {
            if (this.currentSlide === 0) {
                leftControl.style.display = 'none';
            } else {
                leftControl.style.display = '';
            }
        }

        // Hide right arrow on last slide
        if (rightControl) {
            if (this.currentSlide === this.slides.length - 1) {
                rightControl.style.display = 'none';
            } else {
                rightControl.style.display = '';
            }
        }

        // Update carousel thumbnails
        this.updateCarouselThumbnails();
    }

    getCurrentIndex() {
        return this.currentSlide;
    }

    getTotalSlides() {
        return this.slides.length;
    }
}

/* ============================================
   LINE ANIMATOR
   ============================================ */
class LineAnimator {
    constructor(slideEngine) {
        this.engine = slideEngine;
        this.svg = document.getElementById('progress-line');
        this.path = document.getElementById('progress-path');
        this.pathSecondary = document.getElementById('progress-path-secondary');
        this.overlayTop = document.getElementById('wipe-overlay-top');
        this.overlayBottom = document.getElementById('wipe-overlay-bottom');
        this.currentSlide = 0;
        this.isAnimating = false;
        this.resizeTimeout = null;

        // Debug logging
        console.log('LineAnimator constructor - pathSecondary:', this.pathSecondary);
        console.log('LineAnimator constructor - overlayTop:', this.overlayTop);
        console.log('LineAnimator constructor - overlayBottom:', this.overlayBottom);

        // Timing configuration
        this.timing = {
            standard: 400,
            swoop: 600,
            timeline: 1200
        };

        // Store timeout IDs for timeline animation so we can cancel them
        this.timelineTimeouts = [];

        // Store timeout ID for slide 12 expansion animation
        this.slide12ExpansionTimeout = null;

        // Store timeout IDs for slide 12 split animation
        this.slide12SplitTimeouts = [];

        // Store timeout IDs for slide 12 reverse animation
        this.slide12ReverseTimeouts = [];

        // Store timeout IDs for slide 10 to 11 swoop animation
        this.slide10To11Timeouts = [];
    }

    init() {
        if (!this.svg || !this.path) {
            console.warn('LineAnimator: SVG elements not found');
            return;
        }

        // Bind resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Delay initial path calculation to allow first slide to render
        // This ensures getBoundingClientRect returns correct values
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.updatePath(0, false);
                console.log('LineAnimator initialized, path:', this.path.getAttribute('d'));
            });
        });
    }

    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Cancel any ongoing timeline animation
            this.cancelTimelineAnimation();

            // If on slide 10, show all circles and set final path (no animation)
            if (this.currentSlide === 9) {
                this.showAllTimelineCircles();
                // Use requestAnimationFrame to ensure layout is recalculated after CSS changes
                requestAnimationFrame(() => {
                    const fullPath = this.getSlide10TimelinePath();
                    this.path.style.transition = 'none';
                    this.path.setAttribute('d', fullPath);
                    this.path.style.strokeDasharray = 'none';
                    this.path.style.strokeDashoffset = '0';
                });
            } else {
                this.updatePath(this.currentSlide, false);
            }
        }, 200);
    }

    updatePath(slideIndex, animate = true) {
        const previousSlide = this.currentSlide;
        this.currentSlide = slideIndex;

        // If navigating away from slide 10, cancel any ongoing timeline animation
        // Also cancel if there are any pending timeouts (defensive check)
        if (slideIndex !== 9 && (previousSlide === 9 || this.timelineTimeouts.length > 0)) {
            this.cancelTimelineAnimation();
            this.showAllTimelineCircles();
        }

        const pathData = this.getPathForSlide(slideIndex);
        if (!pathData) return;

        // Special handling for slide 10 timeline - step-by-step animation with circles
        if (slideIndex === 9 && animate) {
            this.animateTimelineStepByStep();
        }
        // Special handling for slide 12 - expand outward animation
        else if (slideIndex === 11 && animate) {
            this.animateSlide12Expansion();
            this.showAllTimelineCircles();
        }
        else {
            if (animate) {
                this.path.style.transition = `d ${this.timing.standard}ms ease-out`;
            } else {
                this.path.style.transition = 'none';
            }

            this.path.setAttribute('d', pathData);
            this.path.style.strokeDasharray = 'none';
            this.path.style.strokeDashoffset = '0';

            // If navigating away from slide 10, show all circles immediately
            if (this.currentSlide !== 9) {
                this.showAllTimelineCircles();
            }
        }

        // Hide secondary path and reset overlays on non-slide-12 slides
        if (slideIndex !== 11) {
            if (this.pathSecondary) {
                this.pathSecondary.style.transition = 'none';
                this.pathSecondary.setAttribute('d', 'M 0,0 L 0,0');
            }

            // Reset overlays when leaving slide 12
            if (this.overlayTop && this.overlayBottom) {
                this.overlayTop.style.transition = 'none';
                this.overlayBottom.style.transition = 'none';
                this.overlayTop.style.height = '0';
                this.overlayTop.style.top = '0';
                this.overlayTop.style.opacity = '0';
                this.overlayTop.style.display = 'none';
                this.overlayBottom.style.height = '0';
                this.overlayBottom.style.bottom = '0';
                this.overlayBottom.style.opacity = '0';
                this.overlayBottom.style.display = 'none';
            }

            // Cancel any pending split animations (but don't reset overlays if we're going to slide 12)
            this.cancelSlide12Split();
        }
    }

    hideTimelineCircles() {
        const circles = document.querySelectorAll('#slide-10 .timeline-milestone .circle');
        const boxes = document.querySelectorAll('#slide-10 .timeline-milestone .content-box');
        circles.forEach(circle => {
            circle.classList.remove('circle-visible');
        });
        boxes.forEach(box => {
            box.classList.remove('box-visible');
        });
    }

    showAllTimelineCircles() {
        const circles = document.querySelectorAll('#slide-10 .timeline-milestone .circle');
        const boxes = document.querySelectorAll('#slide-10 .timeline-milestone .content-box');
        circles.forEach(circle => {
            circle.classList.add('circle-visible');
        });
        boxes.forEach(box => {
            box.classList.add('box-visible');
        });
    }

    cancelTimelineAnimation() {
        // Clear all pending timeouts
        this.timelineTimeouts.forEach(id => clearTimeout(id));
        this.timelineTimeouts = [];

        // Remove the temporary timeline SVG
        const timelineSvg = document.getElementById('timeline-segments-svg');
        if (timelineSvg) {
            timelineSvg.remove();
        }
    }

    animateTimelineStepByStep() {
        // Hide all circles first
        this.hideTimelineCircles();

        const slide = document.getElementById('slide-10');
        const header = slide?.querySelector('.slide-header .slide-title-text');
        const milestones = slide?.querySelectorAll('.timeline-milestone');
        const rows = slide?.querySelectorAll('.timeline-row');

        if (!header || !milestones || milestones.length < 7) {
            this.path.setAttribute('d', this.getSlide10TimelinePath());
            this.showAllTimelineCircles();
            return;
        }

        const headerRect = header.getBoundingClientRect();
        const padding = 60;
        const circleRadius = 20;
        const targetCircleRadius = 25;

        const startX = padding;
        const startY = headerRect.bottom;
        const headerEndX = window.innerWidth - padding;

        const row1 = rows[0].getBoundingClientRect();
        const row2 = rows[1].getBoundingClientRect();
        const row3 = rows[2].getBoundingClientRect();
        const row1Y = row1.top + 20;
        const row2Y = row2.top + 20;
        const row3Y = row3.top + 25; // Target circle is 50px, so center is at top + 25

        // Get circle info
        const getCircleInfo = (index, isTarget = false) => {
            const milestone = milestones[index];
            const circle = milestone?.querySelector('.circle');
            if (!circle) return null;
            const rect = circle.getBoundingClientRect();
            const r = isTarget ? targetCircleRadius : circleRadius;
            return {
                element: circle,
                left: rect.left + rect.width / 2 - r,
                right: rect.left + rect.width / 2 + r,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            };
        };

        const circles = [
            getCircleInfo(0), getCircleInfo(1), getCircleInfo(2),
            getCircleInfo(3), getCircleInfo(4), getCircleInfo(5),
            getCircleInfo(6, true)
        ];

        // Animation sequence - each step adds more to the path, then shows a circle
        const steps = [
            // Step 0: Header underline + drop to row 1
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y}`,
                circleIndex: 2
            },
            // Step 1: Continue to circle 2
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y} M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y}`,
                circleIndex: 1
            },
            // Step 2: Continue to circle 1
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y} M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y} M ${circles[1].left},${row1Y} L ${circles[0].right},${row1Y}`,
                circleIndex: 0
            },
            // Step 3: Drop to row 2, continue to circle 4 (left side)
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y} M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y} M ${circles[1].left},${row1Y} L ${circles[0].right},${row1Y} M ${circles[0].left},${row1Y} L ${padding},${row1Y} L ${padding},${row2Y} L ${circles[3].left},${row2Y}`,
                circleIndex: 3
            },
            // Step 4: Continue to circle 5
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y} M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y} M ${circles[1].left},${row1Y} L ${circles[0].right},${row1Y} M ${circles[0].left},${row1Y} L ${padding},${row1Y} L ${padding},${row2Y} L ${circles[3].left},${row2Y} M ${circles[3].right},${row2Y} L ${circles[4].left},${row2Y}`,
                circleIndex: 4
            },
            // Step 5: Continue to circle 6
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y} M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y} M ${circles[1].left},${row1Y} L ${circles[0].right},${row1Y} M ${circles[0].left},${row1Y} L ${padding},${row1Y} L ${padding},${row2Y} L ${circles[3].left},${row2Y} M ${circles[3].right},${row2Y} L ${circles[4].left},${row2Y} M ${circles[4].right},${row2Y} L ${circles[5].left},${row2Y}`,
                circleIndex: 5
            },
            // Step 6: Drop to row 3, to target circle
            {
                path: `M ${startX},${startY} L ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y} M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y} M ${circles[1].left},${row1Y} L ${circles[0].right},${row1Y} M ${circles[0].left},${row1Y} L ${padding},${row1Y} L ${padding},${row2Y} L ${circles[3].left},${row2Y} M ${circles[3].right},${row2Y} L ${circles[4].left},${row2Y} M ${circles[4].right},${row2Y} L ${circles[5].left},${row2Y} M ${circles[5].right},${row2Y} L ${headerEndX},${row2Y} L ${headerEndX},${row3Y} L ${circles[6].right},${row3Y}`,
                circleIndex: 6
            }
        ];

        // Get the target milestone's content box for the final segments
        const targetMilestone = milestones[6];
        const targetContentBox = targetMilestone?.querySelector('.content-box');
        const contentBoxRect = targetContentBox?.getBoundingClientRect();
        const targetCircle = circles[6];

        // Calculate positions for final segments
        const circleBottomY = targetCircle.centerY + targetCircleRadius;
        const contentBoxTopY = contentBoxRect ? contentBoxRect.top : circleBottomY + 15;
        const contentBoxBottomY = contentBoxRect ? contentBoxRect.bottom : contentBoxTopY + 100;
        const verticalSegmentLength = contentBoxTopY - circleBottomY;
        const finalY = contentBoxBottomY + (verticalSegmentLength * 4);

        // Define individual line segments (each is a continuous line that can be animated with stroke-dashoffset)
        // These are the segments AFTER the header underline (which is already visible)
        const drawSegments = [
            // Segment 0: Drop down from header to row 1, go left to circle 3
            { path: `M ${headerEndX},${startY} L ${headerEndX},${row1Y} L ${circles[2].right},${row1Y}`, circleIndex: 2 },
            // Segment 1: From left of circle 3 to circle 2
            { path: `M ${circles[2].left},${row1Y} L ${circles[1].right},${row1Y}`, circleIndex: 1 },
            // Segment 2: From left of circle 2 to circle 1
            { path: `M ${circles[1].left},${row1Y} L ${circles[0].right},${row1Y}`, circleIndex: 0 },
            // Segment 3: From left of circle 1, down to row 2, to circle 4
            { path: `M ${circles[0].left},${row1Y} L ${padding},${row1Y} L ${padding},${row2Y} L ${circles[3].left},${row2Y}`, circleIndex: 3 },
            // Segment 4: From right of circle 4 to circle 5
            { path: `M ${circles[3].right},${row2Y} L ${circles[4].left},${row2Y}`, circleIndex: 4 },
            // Segment 5: From right of circle 5 to circle 6
            { path: `M ${circles[4].right},${row2Y} L ${circles[5].left},${row2Y}`, circleIndex: 5 },
            // Segment 6: From right of circle 6, down to row 3, to target circle
            { path: `M ${circles[5].right},${row2Y} L ${headerEndX},${row2Y} L ${headerEndX},${row3Y} L ${circles[6].right},${row3Y}`, circleIndex: 6 },
            // Segment 7: From bottom of target circle down to top of content box
            { path: `M ${targetCircle.centerX},${circleBottomY} L ${targetCircle.centerX},${contentBoxTopY}`, circleIndex: null },
            // Segment 8: From bottom of content box down (same length as segment 7)
            { path: `M ${targetCircle.centerX},${contentBoxBottomY} L ${targetCircle.centerX},${finalY}`, circleIndex: null },
            // Segment 9: 90 degree turn right to end of viewport
            { path: `M ${targetCircle.centerX},${finalY} L ${window.innerWidth},${finalY}`, circleIndex: null },
        ];

        // Clear any previous timeouts and remove old SVG first
        this.cancelTimelineAnimation();

        // Create fresh SVG container for timeline segments
        const timelineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        timelineSvg.id = 'timeline-segments-svg';
        timelineSvg.setAttribute('class', 'progress-line');
        timelineSvg.setAttribute('aria-hidden', 'true');
        timelineSvg.setAttribute('preserveAspectRatio', 'none');
        document.body.appendChild(timelineSvg);

        // Keep the main progress path as the header underline
        this.path.style.transition = 'none';
        this.path.style.strokeDasharray = 'none';
        this.path.style.strokeDashoffset = '0';
        this.path.setAttribute('d', `M ${startX},${startY} L ${headerEndX},${startY}`);

        // Animation timing
        const drawDuration = 800; // ms to draw each segment
        const pauseAfterCircle = 300; // ms pause after showing circle

        let currentDelay = 50; // Small initial delay

        drawSegments.forEach((segment, i) => {
            // Create a path element for this segment
            const segmentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            segmentPath.setAttribute('class', 'progress-path');
            segmentPath.setAttribute('d', segment.path);
            timelineSvg.appendChild(segmentPath);

            // Get the length of this segment
            const segmentLength = segmentPath.getTotalLength();

            // Set up the stroke-dash for drawing animation (hidden initially)
            segmentPath.style.strokeDasharray = segmentLength;
            segmentPath.style.strokeDashoffset = segmentLength;

            // Schedule the draw animation
            const drawTimeoutId = setTimeout(() => {
                segmentPath.style.transition = `stroke-dashoffset ${drawDuration}ms ease-out`;
                segmentPath.style.strokeDashoffset = '0';
            }, currentDelay);
            this.timelineTimeouts.push(drawTimeoutId);

            currentDelay += drawDuration;

            // Show the circle and its content box after segment is drawn (if this segment has a circle)
            if (segment.circleIndex !== null) {
                const circleTimeoutId = setTimeout(() => {
                    const milestone = milestones[segment.circleIndex];
                    if (circles[segment.circleIndex]?.element) {
                        circles[segment.circleIndex].element.classList.add('circle-visible');
                    }
                    const contentBox = milestone?.querySelector('.content-box');
                    if (contentBox) {
                        contentBox.classList.add('box-visible');
                    }
                }, currentDelay);
                this.timelineTimeouts.push(circleTimeoutId);

                currentDelay += pauseAfterCircle;
            }
        });

        // After all animations complete, consolidate into main path
        const totalDuration = currentDelay + 100;
        const finalTimeoutId = setTimeout(() => {
            // Set the main path to the full timeline path (use the getSlide10TimelinePath for consistency)
            this.path.setAttribute('d', this.getSlide10TimelinePath());
            // Remove the temporary segment SVG
            const svg = document.getElementById('timeline-segments-svg');
            if (svg) {
                svg.remove();
            }
        }, totalDuration);
        this.timelineTimeouts.push(finalTimeoutId);
    }

    getPathForSlide(slideIndex) {
        switch (slideIndex) {
            case 0:
                return this.getSlide1Path();
            case 1:
                return this.getSlide2Path();
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                return this.getHeaderUnderlinePath(slideIndex);
            case 9:
                return this.getSlide10TimelinePath();
            case 10:
                return this.getSlide11Path(true);
            case 11:
                return this.getSlide12Path(true);
            default:
                return null;
        }
    }

    getSlide1Path() {
        // Title underline centered under the subtitle
        const slide = document.getElementById('slide-1');
        const subtitle = slide?.querySelector('.slide-subtitle');
        const title = slide?.querySelector('.slide-title-text');

        // Use subtitle if available, otherwise fall back to title
        const referenceElement = subtitle || title;
        if (!referenceElement) return 'M 0,0 L 0,0';

        const rect = referenceElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const y = rect.bottom + 15; // 15px below the subtitle
        const halfWidth = 100; // 200px total width

        return `M ${centerX - halfWidth},${y} L ${centerX + halfWidth},${y}`;
    }

    getSlide2Path() {
        // Stat divider line between stat-label and overview-text
        const slide = document.getElementById('slide-2');
        const statLabel = slide?.querySelector('.stat-label');
        const overviewText = slide?.querySelector('.overview-text');

        if (!statLabel) return this.getSlide1Path();

        const labelRect = statLabel.getBoundingClientRect();
        const overviewRect = overviewText?.getBoundingClientRect();

        // Center horizontally based on viewport
        const centerX = window.innerWidth / 2;

        // Position Y between stat-label bottom and overview-text top
        let y;
        if (overviewRect) {
            y = labelRect.bottom + (overviewRect.top - labelRect.bottom) / 2 - 13;
        } else {
            y = labelRect.bottom + 15;
        }

        // 60% of viewport width, max 500px
        const maxWidth = Math.min(window.innerWidth * 0.6, 500);
        const halfWidth = maxWidth / 2;

        return `M ${centerX - halfWidth},${y} L ${centerX + halfWidth},${y}`;
    }

    getHeaderUnderlinePath(slideIndex) {
        // Header underline for slides 3-9 with progress-based width
        const slideNum = slideIndex + 1;
        const slide = document.getElementById(`slide-${slideNum}`);
        const header = slide?.querySelector('.slide-header .slide-title-text');

        if (!header) return 'M 0,0 L 0,0';

        const rect = header.getBoundingClientRect();
        const slidePadding = 60;
        const startX = slidePadding; // Use consistent padding instead of rect.left
        const y = rect.bottom; // Directly under the header text

        // Progress calculation for slides 3-9 (indices 2-8)
        // Slide 3 = 0%, Slide 9 = 100%
        const progressSlideStart = 2;
        const progressSlideEnd = 8;
        const progressRange = progressSlideEnd - progressSlideStart;

        let progress;
        if (slideIndex <= progressSlideStart) {
            progress = 0;
        } else if (slideIndex >= progressSlideEnd) {
            progress = 1;
        } else {
            progress = (slideIndex - progressSlideStart) / progressRange;
        }

        // minWidth should be approximately the header text width
        // Use a reasonable estimate if rect.width seems wrong
        const headerTextWidth = Math.max(rect.width, 200); // At least 200px
        const minWidth = Math.min(headerTextWidth, 400); // Cap at 400px for slide 3
        const maxWidth = window.innerWidth - startX - slidePadding;
        const lineWidth = minWidth + (maxWidth - minWidth) * progress;

        return `M ${startX},${y} L ${startX + lineWidth},${y}`;
    }

    getSlide10TimelinePath() {
        // Complex snake path through the timeline
        // Line connects between circles, not through them
        const slide = document.getElementById('slide-10');
        const header = slide?.querySelector('.slide-header .slide-title-text');
        const timelineWrapper = slide?.querySelector('.timeline-wrapper');
        const rows = slide?.querySelectorAll('.timeline-row');
        const milestones = slide?.querySelectorAll('.timeline-milestone');

        if (!header || !timelineWrapper || rows.length < 3 || milestones.length < 7) {
            return this.getHeaderUnderlinePath(9);
        }

        const headerRect = header.getBoundingClientRect();
        const padding = 60; // slide padding
        const circleRadius = 20; // Half of 40px circle
        const targetCircleRadius = 25; // Half of 50px target circle

        // Starting point: under header
        const startX = padding;
        const startY = headerRect.bottom;

        // Get milestone circle edges (not centers)
        const getCircleEdges = (index, isTarget = false) => {
            const milestone = milestones[index];
            if (!milestone) return { left: 0, right: 0, top: 0, bottom: 0, centerX: 0, centerY: 0 };
            const circle = milestone.querySelector('.circle');
            if (!circle) return { left: 0, right: 0, top: 0, bottom: 0, centerX: 0, centerY: 0 };
            const rect = circle.getBoundingClientRect();
            const r = isTarget ? targetCircleRadius : circleRadius;
            return {
                left: rect.left + rect.width / 2 - r,
                right: rect.left + rect.width / 2 + r,
                top: rect.top + rect.height / 2 - r,
                bottom: rect.top + rect.height / 2 + r,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            };
        };

        // Row positions
        const row1 = rows[0].getBoundingClientRect();
        const row2 = rows[1].getBoundingClientRect();
        const row3 = rows[2].getBoundingClientRect();

        // Timeline Y positions (center of the circles)
        const row1Y = row1.top + 20;
        const row2Y = row2.top + 20;
        const row3Y = row3.top + 25; // Target circle is 50px, center at top + 25

        // Get circle edges for all milestones
        const c1 = getCircleEdges(0);
        const c2 = getCircleEdges(1);
        const c3 = getCircleEdges(2);
        const c4 = getCircleEdges(3);
        const c5 = getCircleEdges(4);
        const c6 = getCircleEdges(5);
        const c7 = getCircleEdges(6, true); // Target circle is larger

        const headerEndX = window.innerWidth - padding;

        // Build path that connects BETWEEN circles, not through them
        // Row 1: right to left, line goes above circles connecting their tops
        // Row 2: left to right (visually, but DOM is reversed)

        // Get the target milestone's content box for the final segments
        const targetMilestone = milestones[6];
        const targetContentBox = targetMilestone?.querySelector('.content-box');
        const contentBoxRect = targetContentBox?.getBoundingClientRect();

        // Calculate positions for final segments
        const circleBottomY = c7.bottom;
        const contentBoxTopY = contentBoxRect ? contentBoxRect.top : circleBottomY + 15;
        const contentBoxBottomY = contentBoxRect ? contentBoxRect.bottom : contentBoxTopY + 100;
        const verticalSegmentLength = contentBoxTopY - circleBottomY;
        const finalY = contentBoxBottomY + (verticalSegmentLength * 4);

        const pathParts = [
            // Header underline
            `M ${startX},${startY}`,
            `L ${headerEndX},${startY}`,
            // Drop down to row 1 (right side, before circle 3)
            `L ${headerEndX},${row1Y}`,
            // To right edge of circle 3
            `L ${c3.right},${row1Y}`,
            // Gap for circle 3, continue from left edge
            `M ${c3.left},${row1Y}`,
            // To right edge of circle 2
            `L ${c2.right},${row1Y}`,
            // Gap for circle 2, continue from left edge
            `M ${c2.left},${row1Y}`,
            // To right edge of circle 1
            `L ${c1.right},${row1Y}`,
            // Gap for circle 1, continue from left edge
            `M ${c1.left},${row1Y}`,
            // To left edge of row, then down to row 2
            `L ${padding},${row1Y}`,
            `L ${padding},${row2Y}`,
            // Row 2: Display order is 4, 5, 6 (left to right)
            // Line goes left to right: 4 -> 5 -> 6
            `L ${c4.left},${row2Y}`,
            // Gap for circle 4
            `M ${c4.right},${row2Y}`,
            `L ${c5.left},${row2Y}`,
            // Gap for circle 5
            `M ${c5.right},${row2Y}`,
            `L ${c6.left},${row2Y}`,
            // Gap for circle 6
            `M ${c6.right},${row2Y}`,
            // To right edge, then down to row 3
            `L ${headerEndX},${row2Y}`,
            `L ${headerEndX},${row3Y}`,
            // To right edge of target circle
            `L ${c7.right},${row3Y}`,
            // Gap for target circle, then from bottom of circle to top of content box
            `M ${c7.centerX},${circleBottomY}`,
            `L ${c7.centerX},${contentBoxTopY}`,
            // Gap for content box, then from bottom of content box down same length
            `M ${c7.centerX},${contentBoxBottomY}`,
            `L ${c7.centerX},${finalY}`,
            // 90 degree turn right to end of viewport
            `L ${window.innerWidth},${finalY}`,
        ];

        return pathParts.join(' ');
    }

    getSlide11Path(expanded = true) {
        // Position line under the header on slide 11 (Key Takeaways)
        const slide = document.getElementById('slide-11');
        const header = slide?.querySelector('.slide-header .slide-title-text');

        if (!header) return 'M 0,0 L 0,0';

        const rect = header.getBoundingClientRect();
        const slidePadding = 60;
        const y = rect.bottom;

        if (expanded) {
            // Full width (same as slide 9's full progress)
            const startX = slidePadding;
            const endX = window.innerWidth - slidePadding;
            return `M ${startX},${y} L ${endX},${y}`;
        } else {
            // Small left-aligned line (starting position before expansion)
            const smallWidth = 200;
            const startX = slidePadding;
            return `M ${startX},${y} L ${startX + smallWidth},${y}`;
        }
    }

    // Get just the bottom line segment from slide 10 (for transition start point)
    getSlide10BottomLinePath() {
        const slide = document.getElementById('slide-10');
        const milestones = slide?.querySelectorAll('.timeline-milestone');
        const targetMilestone = milestones?.[6];
        const targetContentBox = targetMilestone?.querySelector('.content-box');
        const targetCircle = targetMilestone?.querySelector('.circle');

        if (!targetContentBox || !targetCircle) return null;

        const circleRect = targetCircle.getBoundingClientRect();
        const contentBoxRect = targetContentBox.getBoundingClientRect();
        const targetCircleRadius = 25;

        const circleBottomY = circleRect.top + circleRect.height / 2 + targetCircleRadius;
        const contentBoxTopY = contentBoxRect.top;
        const contentBoxBottomY = contentBoxRect.bottom;
        const verticalSegmentLength = contentBoxTopY - circleBottomY;
        const finalY = contentBoxBottomY + (verticalSegmentLength * 4);
        const centerX = circleRect.left + circleRect.width / 2;

        // Return just the bottom horizontal line segment
        return `M ${centerX},${finalY} L ${window.innerWidth},${finalY}`;
    }

    animateSlide10To11Swoop(onComplete) {
        // Cancel any previous swoop animation
        this.cancelSlide10To11Swoop();

        this.isAnimating = true;

        // Set the path to just the bottom line from slide 10
        const bottomLinePath = this.getSlide10BottomLinePath();
        if (bottomLinePath) {
            this.path.style.transition = 'none';
            this.path.setAttribute('d', bottomLinePath);
        }

        // Force reflow to ensure the path is set before transitioning
        this.path.getBoundingClientRect();

        // Swoop to slide 11's initial (non-expanded) position
        const targetPath = this.getSlide11Path(false);
        this.path.style.transition = `d ${this.timing.swoop}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        this.path.setAttribute('d', targetPath);

        // Trigger slide transition shortly after line starts moving
        const t1 = setTimeout(() => {
            if (!this.isAnimating) return;
            onComplete?.();
        }, this.timing.swoop * 0.2);
        this.slide10To11Timeouts.push(t1);

        // After swoop completes, expand outward
        const t2 = setTimeout(() => {
            if (!this.isAnimating) return;
            const expandedPath = this.getSlide11Path(true);
            this.path.style.transition = `d 1000ms ease-out`;
            this.path.setAttribute('d', expandedPath);
        }, this.timing.swoop + 150);
        this.slide10To11Timeouts.push(t2);

        // Clean up animation state
        const t3 = setTimeout(() => {
            this.isAnimating = false;
            this.currentSlide = 10;
        }, this.timing.swoop + 1200);
        this.slide10To11Timeouts.push(t3);
    }

    cancelSlide10To11Swoop() {
        // Clear all pending swoop animation timeouts
        this.slide10To11Timeouts.forEach(id => clearTimeout(id));
        this.slide10To11Timeouts = [];

        // Reset animation state
        this.isAnimating = false;
    }

    animateSlide12To11Reverse(onComplete) {
        // Cancel any pending animations first (this resets isAnimating)
        this.cancelSlide12Expansion();
        // Don't call cancelSlide12Split here as it hides pathSecondary and resets overlays
        this.slide12SplitTimeouts.forEach(id => clearTimeout(id));
        this.slide12SplitTimeouts = [];
        this.slide12ReverseTimeouts.forEach(id => clearTimeout(id));
        this.slide12ReverseTimeouts = [];

        this.isAnimating = true;

        const slidePadding = 60;
        const swoop = this.timing.swoop;

        // First, reset overlays immediately when starting reverse
        if (this.overlayTop) {
            this.overlayTop.style.transition = `height ${swoop}ms ease-out`;
            this.overlayTop.style.height = '0';
        }
        if (this.overlayBottom) {
            this.overlayBottom.style.transition = `height ${swoop}ms ease-out`;
            this.overlayBottom.style.height = '0';
        }

        // First, ensure pathSecondary is at the correct starting position (full width at header)
        // This prevents the "swoop from 0,0" issue
        if (this.pathSecondary) {
            const fullHeaderPath = this.getSlide12HeaderPath(true);
            this.pathSecondary.style.transition = 'none';
            this.pathSecondary.setAttribute('d', fullHeaderPath);
        }

        // Force reflow to apply the instant position before starting animation
        this.pathSecondary?.getBoundingClientRect();

        // Phase 1: Bottom line (primary) slides down out of view
        const offScreenBottomY = window.innerHeight + 50;
        const offScreenBottomPath = `M ${slidePadding},${offScreenBottomY} L ${window.innerWidth - slidePadding},${offScreenBottomY}`;

        this.path.style.transition = `d ${swoop}ms ease-in`;
        this.path.setAttribute('d', offScreenBottomPath);

        // Phase 1 also: Top line (secondary) shrinks to small left-aligned
        // Since headers are at same Y, this stays in place vertically
        if (this.pathSecondary) {
            const smallPath = this.getSlide12HeaderPath(false);
            this.pathSecondary.style.transition = `d ${swoop}ms ease-out`;
            this.pathSecondary.setAttribute('d', smallPath);
        }

        // Trigger slide transition shortly after shrink starts
        const r1 = setTimeout(() => {
            if (!this.isAnimating) return;
            onComplete?.();
        }, swoop * 0.3);
        this.slide12ReverseTimeouts.push(r1);

        // Phase 2: Top line expands back to full width (now as slide 11's header line)
        const r2 = setTimeout(() => {
            if (!this.isAnimating) return;

            if (this.pathSecondary) {
                const expandedPath = this.getSlide11Path(true);
                this.pathSecondary.style.transition = 'd 800ms ease-out';
                this.pathSecondary.setAttribute('d', expandedPath);
            }

            // Ensure overlays are hidden during reverse animation
            if (this.overlayTop) {
                this.overlayTop.style.transition = `height ${swoop}ms ease-out, opacity ${swoop}ms ease-out`;
                this.overlayTop.style.height = '0';
                this.overlayTop.style.opacity = '0';
            }
            if (this.overlayBottom) {
                this.overlayBottom.style.transition = `height ${swoop}ms ease-out, opacity ${swoop}ms ease-out`;
                this.overlayBottom.style.height = '0';
                this.overlayBottom.style.opacity = '0';
            }
        }, swoop + 100);
        this.slide12ReverseTimeouts.push(r2);

        // Phase 3: Transfer secondary to primary (for state consistency)
        const r3 = setTimeout(() => {
            if (!this.isAnimating) return;

            // Copy expanded position to primary
            const expandedPath = this.getSlide11Path(true);
            this.path.style.transition = 'none';
            this.path.setAttribute('d', expandedPath);

            // Hide secondary
            if (this.pathSecondary) {
                this.pathSecondary.style.transition = 'none';
                this.pathSecondary.setAttribute('d', 'M 0,0 L 0,0');
            }

            // Ensure overlays are fully reset and hidden
            if (this.overlayTop) {
                this.overlayTop.style.transition = 'none';
                this.overlayTop.style.height = '0';
                this.overlayTop.style.top = '0';
                this.overlayTop.style.opacity = '0';
                this.overlayTop.style.display = 'none';
            }
            if (this.overlayBottom) {
                this.overlayBottom.style.transition = 'none';
                this.overlayBottom.style.height = '0';
                this.overlayBottom.style.bottom = '0';
                this.overlayBottom.style.opacity = '0';
                this.overlayBottom.style.display = 'none';
            }
        }, swoop + 950);
        this.slide12ReverseTimeouts.push(r3);

        // Clean up animation state
        const r4 = setTimeout(() => {
            if (!this.isAnimating) return;
            this.isAnimating = false;
            this.currentSlide = 10;
        }, swoop + 1000);
        this.slide12ReverseTimeouts.push(r4);
    }

    getSlide12Path(expanded = true) {
        // Position line at the contact-divider-line position on slide 12
        const slide = document.getElementById('slide-12');
        const divider = slide?.querySelector('.contact-divider-line');

        if (!divider) return 'M 0,0 L 0,0';

        const rect = divider.getBoundingClientRect();
        const y = rect.top + (rect.height / 2);
        const centerX = rect.left + (rect.width / 2);

        if (expanded) {
            // Full width of the divider
            return `M ${rect.left},${y} L ${rect.right},${y}`;
        } else {
            // Same width as slide 1 (200px total, halfWidth = 100)
            const halfWidth = 100;
            return `M ${centerX - halfWidth},${y} L ${centerX + halfWidth},${y}`;
        }
    }

    getSlide12HeaderPath(expanded = true) {
        // Position line under the "Next Steps" header on slide 12
        const slide = document.getElementById('slide-12');
        const header = slide?.querySelector('.slide-header .slide-title-text');

        if (!header) return 'M 0,0 L 0,0';

        const rect = header.getBoundingClientRect();
        const slidePadding = 60;
        const y = rect.bottom;

        if (expanded) {
            return `M ${slidePadding},${y} L ${window.innerWidth - slidePadding},${y}`;
        } else {
            // Small left-aligned line (shrinks from right, left edge stays anchored)
            const smallWidth = 200;
            return `M ${slidePadding},${y} L ${slidePadding + smallWidth},${y}`;
        }
    }

    getScreenCenterPath(expanded = false) {
        // Centered line at viewport middle
        const centerY = window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const slidePadding = 60;

        if (expanded) {
            // Full width line at center Y
            return `M ${slidePadding},${centerY} L ${window.innerWidth - slidePadding},${centerY}`;
        } else {
            // Small centered line
            const halfWidth = 100;
            return `M ${centerX - halfWidth},${centerY} L ${centerX + halfWidth},${centerY}`;
        }
    }

    getSlide12HeaderY() {
        // Get the Y position of the header line on slide 12
        const slide = document.getElementById('slide-12');
        const header = slide?.querySelector('.slide-header .slide-title-text');
        return header ? header.getBoundingClientRect().bottom : 100;
    }

    getSlide12FooterY() {
        // Get the Y position of the footer line on slide 12
        const slide = document.getElementById('slide-12');
        const divider = slide?.querySelector('.contact-divider-line');
        if (!divider) return window.innerHeight - 100;
        const rect = divider.getBoundingClientRect();
        return rect.top + (rect.height / 2);
    }

    cancelSlide12Expansion() {
        if (this.slide12ExpansionTimeout) {
            clearTimeout(this.slide12ExpansionTimeout);
            this.slide12ExpansionTimeout = null;
        }
    }

    animateSlide12Expansion() {
        // Cancel any previous expansion timeout
        this.cancelSlide12Expansion();

        // First, animate to the small centered line (shrink and move down)
        const initialPath = this.getSlide12Path(false);
        this.path.style.transition = `d 800ms ease-out`;
        this.path.setAttribute('d', initialPath);

        // Then expand outward after the move completes plus a brief delay
        this.slide12ExpansionTimeout = setTimeout(() => {
            const expandedPath = this.getSlide12Path(true);
            this.path.style.transition = `d 1000ms ease-out`;
            this.path.setAttribute('d', expandedPath);
            this.slide12ExpansionTimeout = null;
        }, 1200);
    }

    cancelSlide12Split() {
        // Clear all pending split animation timeouts
        this.slide12SplitTimeouts.forEach(id => clearTimeout(id));
        this.slide12SplitTimeouts = [];

        // Clear all pending reverse animation timeouts
        this.slide12ReverseTimeouts.forEach(id => clearTimeout(id));
        this.slide12ReverseTimeouts = [];

        // Reset overlay states - ensure they're completely hidden
        // Only reset if we're not currently on slide 12
        if (this.currentSlide !== 11) {
            if (this.overlayTop) {
                this.overlayTop.style.transition = 'none';
                this.overlayTop.style.height = '0';
                this.overlayTop.style.top = '0';
                this.overlayTop.style.opacity = '0';
                this.overlayTop.style.display = 'none';
            }
            if (this.overlayBottom) {
                this.overlayBottom.style.transition = 'none';
                this.overlayBottom.style.height = '0';
                this.overlayBottom.style.bottom = '0';
                this.overlayBottom.style.opacity = '0';
                this.overlayBottom.style.display = 'none';
            }
        }

        // Hide secondary path
        if (this.pathSecondary) {
            this.pathSecondary.style.transition = 'none';
            this.pathSecondary.setAttribute('d', 'M 0,0 L 0,0');
        }

        // Reset animation state
        this.isAnimating = false;
    }

    animateSlide11To12Split(onSlideReady, onContentReady) {
        // Cancel any previous animations first (this resets isAnimating)
        this.cancelSlide10To11Swoop();
        this.cancelSlide12Split();
        this.cancelSlide12Expansion();

        this.isAnimating = true;

        // Store the content callback for later use
        this.onContentReadyCallback = onContentReady;

        // Ensure we have the overlay elements
        if (!this.overlayTop || !this.overlayBottom || !this.pathSecondary) {
            console.warn('LineAnimator: Missing overlay or secondary path elements');
            this.isAnimating = false;
            onSlideReady?.();
            onContentReady?.();
            return;
        }

        // Trigger slide transition IMMEDIATELY so slide 12 is visible
        onSlideReady?.();

        // Small delay to let slide 12 render, then get positions
        const t0 = setTimeout(() => {
            // Check if animation was cancelled
            if (!this.isAnimating) return;
            const headerY = this.getSlide12HeaderY();
            const footerY = this.getSlide12FooterY();
            const centerY = window.innerHeight / 2;

            console.log('animateSlide11To12Split - headerY:', headerY, 'footerY:', footerY, 'centerY:', centerY);

            // Phase 1: Position overlays to cover content area (between lines), move line to center
            // Top overlay: positioned at TOP of screen, extends DOWN to center
            this.overlayTop.style.transition = 'none';
            this.overlayTop.style.top = '0';
            this.overlayTop.style.height = `${centerY}px`;
            this.overlayTop.style.opacity = '1';
            this.overlayTop.style.display = 'block';

            // Bottom overlay: positioned so bottom edge is at footer line, extends UP to center
            this.overlayBottom.style.transition = 'none';
            this.overlayBottom.style.bottom = `${window.innerHeight - footerY}px`;
            this.overlayBottom.style.height = `${footerY - centerY}px`;
            this.overlayBottom.style.opacity = '1';
            this.overlayBottom.style.display = 'block';

            // Force reflow
            this.overlayTop.getBoundingClientRect();
            this.overlayBottom.getBoundingClientRect();

            // Move line from slide 11 to center (small)
            const centerPathSmall = this.getScreenCenterPath(false);
            this.path.style.transition = `d ${this.timing.swoop}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            this.path.setAttribute('d', centerPathSmall);

            // Continue with rest of animation...
            this.continueSlide12SplitAnimation(headerY, footerY, centerY);
        }, 50);
        this.slide12SplitTimeouts.push(t0);
    }

    continueSlide12SplitAnimation(headerY, footerY, centerY) {
        // Phase 2: Line EXPANDS to full width at center (overlays still covering content)
        const t2 = setTimeout(() => {
            if (!this.isAnimating) return;  // Check if cancelled
            const centerPathExpanded = this.getScreenCenterPath(true);
            this.path.style.transition = 'd 600ms ease-out';
            this.path.setAttribute('d', centerPathExpanded);
        }, this.timing.swoop + 150);
        this.slide12SplitTimeouts.push(t2);

        // Phase 3: Lines SPLIT and move - overlays RETRACT, revealing content between
        const t3 = setTimeout(() => {
            if (!this.isAnimating) return;  // Check if cancelled
            const centerPathExpanded = this.getScreenCenterPath(true);

            // Set up secondary path at center (full width)
            if (this.pathSecondary) {
                this.pathSecondary.style.transition = 'none';
                this.pathSecondary.setAttribute('d', centerPathExpanded);
                this.pathSecondary.getBoundingClientRect();
            }

            // Primary path moves DOWN to footer
            const footerPath = this.getSlide12Path(true);
            this.path.style.transition = `d ${this.timing.swoop}ms ease-out`;
            this.path.setAttribute('d', footerPath);

            // Secondary path moves UP to header
            if (this.pathSecondary) {
                const headerPath = this.getSlide12HeaderPath(true);
                this.pathSecondary.style.transition = `d ${this.timing.swoop}ms ease-out`;
                this.pathSecondary.setAttribute('d', headerPath);
            }

            // Overlays RETRACT to 0 - revealing content as lines move apart
            if (this.overlayTop) {
                this.overlayTop.style.transition = `height ${this.timing.swoop}ms ease-out`;
                this.overlayTop.style.height = '0';
            }

            if (this.overlayBottom) {
                this.overlayBottom.style.transition = `height ${this.timing.swoop}ms ease-out`;
                this.overlayBottom.style.height = '0';
            }
        }, this.timing.swoop + 800);
        this.slide12SplitTimeouts.push(t3);

        // Phase 4: Trigger content animations AFTER lines are in place
        const t4 = setTimeout(() => {
            if (!this.isAnimating) return;  // Check if cancelled
            if (this.onContentReadyCallback) {
                this.onContentReadyCallback();
                this.onContentReadyCallback = null;
            }
        }, this.timing.swoop * 2 + 850);
        this.slide12SplitTimeouts.push(t4);

        // Cleanup
        const t5 = setTimeout(() => {
            if (!this.isAnimating) return;  // Check if cancelled
            this.isAnimating = false;
            this.currentSlide = 11;
        }, this.timing.swoop * 2 + 1200);
        this.slide12SplitTimeouts.push(t5);
    }

    animateTimelinePath() {
        // Animate the timeline path drawing
        const pathLength = this.path.getTotalLength();

        this.path.style.strokeDasharray = pathLength;
        this.path.style.strokeDashoffset = pathLength;
        this.path.style.transition = 'none';

        // Force reflow
        this.path.getBoundingClientRect();

        // Animate
        this.path.style.transition = `stroke-dashoffset ${this.timing.timeline}ms ease-in-out`;
        this.path.style.strokeDashoffset = '0';
    }

    // Special transition for slide 2 to 3 (swoop)
    // The line moves along a curved path, not draws the curve
    animateSwoopTransition(fromSlide, toSlide, onComplete) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Animate to the slide 3 header underline position
        // Use the same path calculation as getHeaderUnderlinePath for consistency
        const targetPath = this.getHeaderUnderlinePath(2); // slideIndex 2 = slide 3

        // Set up the transition BEFORE changing the path
        this.path.style.transition = `d ${this.timing.swoop}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        this.path.setAttribute('d', targetPath);
        this.currentSlide = 2;

        // Trigger slide transition shortly after line starts moving
        setTimeout(() => {
            onComplete?.();
        }, this.timing.swoop * 0.2);

        // Clean up animation state
        setTimeout(() => {
            this.isAnimating = false;
        }, this.timing.swoop);
    }

    // Reverse swoop for going back from slide 3 to 2
    animateReverseSwoopTransition(fromSlide, toSlide, onComplete) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Simply transition to slide 2 path
        this.path.style.transition = `d ${this.timing.swoop}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        this.path.setAttribute('d', this.getSlide2Path());

        setTimeout(() => {
            onComplete?.();
        }, this.timing.swoop * 0.4);

        setTimeout(() => {
            this.isAnimating = false;
            this.currentSlide = 1;
        }, this.timing.swoop);
    }
}

/* ============================================
   CHART FACTORY
   ============================================ */

// Register the datalabels plugin globally
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

const ChartFactory = {
    theme: {
        primary: '#E07A47',
        secondary: '#5D87A1',
        background: '#2C3E50',
        text: '#FFFFFF',
        textSecondary: '#95A5A6',
        gridLines: 'rgba(255, 255, 255, 0.1)',

        gradient: [
            '#5D6D7E', '#7B8A8E', '#A0856E', '#C47A50', '#D86835',
            '#E85A20', '#F24A10', '#FC3F00'
        ],

        categorical: [
            '#E07A47', '#5D87A1', '#2E7D32', '#8B3A3A', '#7B68EE',
            '#4A90E2', '#FFA726', '#26A69A', '#AB47BC', '#78909C'
        ]
    },

    defaults: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 1200,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(44, 62, 80, 0.95)',
                titleColor: '#E07A47',
                bodyColor: '#FFFFFF',
                borderColor: '#E07A47',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                titleFont: {
                    family: "'Segoe UI', sans-serif",
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    family: "'Segoe UI', sans-serif",
                    size: 13
                }
            },
            datalabels: {
                color: '#FFFFFF',
                font: {
                    family: "'Segoe UI', sans-serif",
                    size: 11,
                    weight: 'bold'
                },
                formatter: (value) => ChartFactory.formatNumber(value),
                anchor: 'center',
                align: 'center',
                textStrokeColor: 'rgba(0,0,0,0.8)',
                textStrokeWidth: 3,
                display: true
            }
        }
    },

    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`ChartFactory: Canvas "${canvasId}" not found`);
            return null;
        }

        const colors = this.generateColors(data.values.length, options.colorScheme || 'gradient', data.values);
        const isPercentage = options.isPercentage || false;
        const self = this;

        const config = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label || '',
                    data: data.values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => this.adjustBrightness(c, -20)),
                    borderWidth: 1,
                    borderRadius: options.borderRadius || 4
                }]
            },
            options: this.mergeOptions({
                scales: {
                    x: {
                        grid: { color: this.theme.gridLines },
                        ticks: {
                            color: this.theme.text,
                            font: { family: "'Segoe UI', sans-serif", size: 11 }
                        }
                    },
                    y: {
                        grid: { color: this.theme.gridLines },
                        ticks: {
                            color: this.theme.text,
                            font: { family: "'Segoe UI', sans-serif", size: 11 },
                            callback: isPercentage
                                ? (value) => value + '%'
                                : (value) => this.formatNumber(value)
                        },
                        beginAtZero: true
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutCubic',
                    delay: (context) => context.dataIndex * 80
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed.y;
                                if (isPercentage) {
                                    return context.dataset.label + ': ' + value.toFixed(1) + '%';
                                }
                                return context.dataset.label + ': ' + value.toLocaleString();
                            }
                        }
                    },
                    datalabels: {
                        color: '#FFFFFF',
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        font: {
                            family: "'Segoe UI', sans-serif",
                            size: 12,
                            weight: 'bold'
                        },
                        formatter: function (value) {
                            if (isPercentage) {
                                return value.toFixed(1) + '%';
                            }
                            return self.formatNumber(value);
                        }
                    }
                }
            }, options)
        };

        return new Chart(ctx, config);
    },

    createHorizontalBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`ChartFactory: Canvas "${canvasId}" not found`);
            return null;
        }

        const colors = this.generateColors(data.values.length, options.colorScheme || 'gradient', data.values);
        const isPercentage = options.isPercentage || false;
        const self = this;

        const config = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label || '',
                    data: data.values,
                    backgroundColor: colors,
                    borderColor: colors.map(c => this.adjustBrightness(c, -20)),
                    borderWidth: 1,
                    borderRadius: options.borderRadius || 4
                }]
            },
            options: this.mergeOptions({
                indexAxis: 'y',
                scales: {
                    x: {
                        grid: { color: this.theme.gridLines },
                        ticks: {
                            color: this.theme.text,
                            font: { family: "'Segoe UI', sans-serif", size: 11 },
                            callback: isPercentage
                                ? (value) => value + '%'
                                : (value) => this.formatNumber(value)
                        },
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: this.theme.text,
                            font: { family: "'Segoe UI', sans-serif", size: 11 }
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutCubic',
                    delay: (context) => context.dataIndex * 80
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed.x;
                                if (isPercentage) {
                                    return context.dataset.label + ': ' + value.toFixed(1) + '%';
                                }
                                return context.dataset.label + ': ' + value.toLocaleString();
                            }
                        }
                    },
                    datalabels: {
                        color: '#FFFFFF',
                        anchor: 'end',
                        align: 'right',
                        offset: 4,
                        font: {
                            family: "'Segoe UI', sans-serif",
                            size: 12,
                            weight: 'bold'
                        },
                        formatter: function (value) {
                            if (isPercentage) {
                                return value.toFixed(1) + '%';
                            }
                            return self.formatNumber(value);
                        }
                    }
                }
            }, options)
        };

        return new Chart(ctx, config);
    },

    generateColors(count, scheme = 'gradient', values = null) {
        if (scheme === 'gradient' && values) {
            // Color based on value - higher values get more orange
            const gradient = this.theme.gradient;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min || 1;

            return values.map(val => {
                const normalized = (val - min) / range;
                const index = Math.round(normalized * (gradient.length - 1));
                return gradient[Math.min(index, gradient.length - 1)];
            });
        } else if (scheme === 'gradient') {
            const gradient = this.theme.gradient;
            const step = (gradient.length - 1) / (count - 1);
            return Array.from({ length: count }, (_, i) => {
                const index = Math.round(i * step);
                return gradient[Math.min(index, gradient.length - 1)];
            });
        } else if (scheme === 'categorical') {
            return this.theme.categorical.slice(0, count);
        } else if (scheme === 'single') {
            return Array(count).fill(this.theme.primary);
        }

        return Array(count).fill(this.theme.primary);
    },

    mergeOptions(chartOptions, userOptions) {
        return {
            ...this.defaults,
            ...chartOptions,
            ...userOptions,
            plugins: {
                ...this.defaults.plugins,
                ...chartOptions.plugins,
                ...userOptions.plugins
            }
        };
    },

    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'K';
        }
        return value.toLocaleString();
    },

    adjustBrightness(hex, percent) {
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(Math.min((num >> 16) + amt, 255), 0);
        const G = Math.max(Math.min((num >> 8 & 0x00FF) + amt, 255), 0);
        const B = Math.max(Math.min((num & 0x0000FF) + amt, 255), 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
};

/* ============================================
   TIMELINE RENDERER
   ============================================ */
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container || !CHART_DATA.timeline) return;

    let html = '<div class="timeline-wrapper">';

    // Row 1: First 3 milestones displayed as 3, 2, 1 (left to right)
    // Line travels right to left: 3 <- 2 <- 1
    html += '<div class="timeline-row">';
    CHART_DATA.timeline.slice(0, 3).reverse().forEach((milestone, index) => {
        html += renderMilestone(milestone, 3 - index);
    });
    html += '</div>';

    // Row 2: Next 3 milestones (left to right display: 4, 5, 6)
    // Position 5 (Year 5 2030) gets a star based on isTarget flag
    html += '<div class="timeline-row">';
    CHART_DATA.timeline.slice(3, 6).forEach((milestone, index) => {
        html += renderMilestone(milestone, index + 4, milestone.isTarget);
    });
    html += '</div>';

    // Row 3: Bottom milestone (2034+ with number 7)
    html += '<div class="timeline-row timeline-row-target">';
    html += renderMilestone(CHART_DATA.timeline[6], 7, CHART_DATA.timeline[6].isTarget);
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
}

function renderMilestone(milestone, number, isTarget = false) {
    const items = milestone.items.map(item => `<li>${item}</li>`).join('');
    const targetClass = isTarget || milestone.isTarget ? 'milestone-target' : '';

    return `
    <div class="timeline-milestone ${targetClass}">
      <div class="circle">${isTarget ? '★' : number}</div>
      <div class="content-box">
        <div class="milestone-period">${milestone.period}</div>
        <div class="milestone-phase">${milestone.phase}</div>
        <ul class="milestone-items">${items}</ul>
      </div>
    </div>
  `;
}

/* ============================================
   BACKGROUND IMAGE LOADER
   ============================================ */
function initBackgroundImages() {
    const bgImages = document.querySelectorAll('.bg-image');
    bgImages.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
            img.addEventListener('error', () => {
                img.classList.add('loaded');
            });
        }
    });
}

/* ============================================
   CHART INITIALIZATION
   ============================================ */
// Store chart instances for destruction/recreation
const chartInstances = {};

function initSlideContent(slideIndex) {
    switch (slideIndex) {
        case 3: // Slide 4 - Temporal Patterns
            initTemporalCharts();
            break;
        case 5: // Slide 6 - Weather & Severity
            initWeatherCharts();
            break;
        case 7: // Slide 8 - Geographic Concentration
            initGeographicCharts();
            break;
        case 8: // Slide 9 - Hotspot Investment (Map)
            // Map handled by inline script in index.html
            break;
    }
}

function initTemporalCharts() {
    // Destroy existing charts to re-animate
    if (chartInstances['chart-hourly']) {
        chartInstances['chart-hourly'].destroy();
    }
    if (chartInstances['chart-monthly']) {
        chartInstances['chart-monthly'].destroy();
    }

    chartInstances['chart-hourly'] = ChartFactory.createBarChart('chart-hourly', CHART_DATA.hourly, {
        colorScheme: 'gradient'
    });

    chartInstances['chart-monthly'] = ChartFactory.createHorizontalBarChart('chart-monthly', CHART_DATA.monthly, {
        colorScheme: 'gradient'
    });
}

function initWeatherCharts() {
    // Destroy existing charts to re-animate
    if (chartInstances['chart-weather-severity']) {
        chartInstances['chart-weather-severity'].destroy();
    }
    if (chartInstances['chart-weather-volume']) {
        chartInstances['chart-weather-volume'].destroy();
    }

    chartInstances['chart-weather-severity'] = ChartFactory.createBarChart('chart-weather-severity', CHART_DATA.weatherSeverity, {
        colorScheme: 'gradient',
        isPercentage: true
    });

    chartInstances['chart-weather-volume'] = ChartFactory.createHorizontalBarChart('chart-weather-volume', CHART_DATA.weatherVolume, {
        colorScheme: 'gradient'
    });
}

function initGeographicCharts() {
    // Destroy existing charts to re-animate
    if (chartInstances['chart-states']) {
        chartInstances['chart-states'].destroy();
    }
    if (chartInstances['chart-cities']) {
        chartInstances['chart-cities'].destroy();
    }

    chartInstances['chart-states'] = ChartFactory.createBarChart('chart-states', CHART_DATA.topStates, {
        colorScheme: 'gradient'
    });

    chartInstances['chart-cities'] = ChartFactory.createHorizontalBarChart('chart-cities', CHART_DATA.topCities, {
        colorScheme: 'gradient'
    });
}

/* ============================================
   MAP RENDERER (D3.js)
   ============================================ */
class MapRenderer {
    constructor(containerId, data) {
        this.containerId = containerId;
        this.data = data;
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.tooltip = null;
        this.initialized = false;

        // US TopoJSON URL
        this.topoJsonUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

        // Tier 1 state FIPS codes
        this.tier1StateFips = {
            '06': 'CA', // California
            '12': 'FL', // Florida
            '48': 'TX', // Texas
            '45': 'SC', // South Carolina
            '36': 'NY'  // New York
        };
    }

    async init() {
        // Map now handled by inline script in index.html
        return;

        if (this.initialized) return;

        console.log('MapRenderer.init(): Starting...');

        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`MapRenderer.init(): Container #${this.containerId} not found`);
            return;
        }
        console.log('MapRenderer.init(): Container found');

        // Check if D3 and TopoJSON are loaded
        if (typeof d3 === 'undefined') {
            console.error('MapRenderer.init(): D3.js not loaded');
            container.innerHTML = '<p style="color: #E07A47; text-align: center;">D3.js failed to load</p>';
            return;
        }
        if (typeof topojson === 'undefined') {
            console.error('MapRenderer.init(): TopoJSON not loaded');
            container.innerHTML = '<p style="color: #E07A47; text-align: center;">TopoJSON failed to load</p>';
            return;
        }
        console.log('MapRenderer.init(): D3 and TopoJSON available');

        this.tooltip = document.getElementById('map-tooltip');

        try {
            console.log('MapRenderer.init(): Fetching TopoJSON from', this.topoJsonUrl);
            // Fetch US TopoJSON data
            const us = await d3.json(this.topoJsonUrl);
            console.log('MapRenderer.init(): TopoJSON loaded, rendering map...');
            this.render(container, us);
            this.initialized = true;
            console.log('MapRenderer.init(): US map initialized successfully');
        } catch (error) {
            console.error('MapRenderer.init(): Failed to load map data:', error);
            container.innerHTML = `<p style="color: #E07A47; text-align: center; padding: 20px;">Map failed to load: ${error.message}</p>`;
        }
    }

    render(container, us) {
        const width = 550;
        const height = 350;

        // Create SVG
        this.svg = d3.select(container)
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Create projection
        this.projection = d3.geoAlbersUsa()
            .scale(700)
            .translate([width / 2, height / 2]);

        this.path = d3.geoPath().projection(this.projection);

        // Get state features
        const states = topojson.feature(us, us.objects.states).features;

        // Draw states
        this.svg.selectAll('.state')
            .data(states)
            .enter()
            .append('path')
            .attr('class', d => {
                const fips = d.id.toString().padStart(2, '0');
                const stateCode = this.tier1StateFips[fips];
                return stateCode ? 'state tier-1-state' : 'state';
            })
            .attr('d', this.path)
            .attr('data-state', d => {
                const fips = d.id.toString().padStart(2, '0');
                return this.tier1StateFips[fips] || '';
            })
            .on('mouseenter', (event, d) => this.handleStateHover(event, d))
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => this.hideTooltip());

        // Draw city markers
        this.drawCityMarkers();
    }

    drawCityMarkers() {
        const cities = this.data.tier2Cities;

        Object.entries(cities).forEach(([key, city]) => {
            const coords = this.projection(city.coords);
            if (!coords) return;

            // Draw marker
            this.svg.append('circle')
                .attr('class', 'city-marker')
                .attr('cx', coords[0])
                .attr('cy', coords[1])
                .attr('r', 6)
                .attr('data-city', key)
                .on('mouseenter', (event) => this.handleCityHover(event, city))
                .on('mousemove', (event) => this.moveTooltip(event))
                .on('mouseleave', () => this.hideTooltip());

            // Draw label
            this.svg.append('text')
                .attr('class', 'city-label')
                .attr('x', coords[0])
                .attr('y', coords[1] - 10)
                .text(city.name);
        });
    }

    handleStateHover(event, d) {
        const fips = d.id.toString().padStart(2, '0');
        const stateCode = this.tier1StateFips[fips];

        if (!stateCode || !this.data.tier1States[stateCode]) return;

        const state = this.data.tier1States[stateCode];

        this.showTooltip(event, `
            <div class="tooltip-title">${state.name}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Accidents:</span>
                <span class="tooltip-value">${state.accidents.toLocaleString()} (${state.percent})</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Investment:</span>
                <span class="tooltip-value">${state.investment}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Prevented:</span>
                <span class="tooltip-value">${state.prevented}/year</span>
            </div>
        `);
    }

    handleCityHover(event, city) {
        this.showTooltip(event, `
            <div class="tooltip-title">${city.name}, ${city.state}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Accidents:</span>
                <span class="tooltip-value">${city.accidents.toLocaleString()}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Program:</span>
                <span class="tooltip-value">${city.program}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Investment:</span>
                <span class="tooltip-value">${city.investment}</span>
            </div>
        `);
    }

    showTooltip(event, content) {
        if (!this.tooltip) return;

        this.tooltip.innerHTML = content;
        this.tooltip.classList.add('visible');
        this.moveTooltip(event);
    }

    moveTooltip(event) {
        if (!this.tooltip) return;

        const offset = 15;
        let x = event.pageX + offset;
        let y = event.pageY + offset;

        // Keep tooltip in viewport
        const rect = this.tooltip.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = event.pageX - rect.width - offset;
        }
        if (y + rect.height > window.innerHeight) {
            y = event.pageY - rect.height - offset;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    hideTooltip() {
        if (!this.tooltip) return;
        this.tooltip.classList.remove('visible');
    }
}

// Map instance
let mapRenderer = null;
let mapInitAttempted = false;

function initMap() {
    // Map now handled by inline script in index.html - disable this function
    return;

    if (mapRenderer && mapRenderer.initialized) return;
    if (mapInitAttempted) return;
    mapInitAttempted = true;

    console.log('initMap: Starting map initialization...');

    // Check if D3 and TopoJSON are loaded
    if (typeof d3 === 'undefined') {
        console.error('initMap: D3.js not loaded');
        return;
    }
    if (typeof topojson === 'undefined') {
        console.error('initMap: TopoJSON not loaded');
        return;
    }

    // Check if map data exists
    if (typeof CHART_DATA === 'undefined' || !CHART_DATA.mapData) {
        console.error('initMap: CHART_DATA.mapData not found');
        return;
    }

    // Check if container exists
    const container = document.getElementById('us-map');
    if (!container) {
        console.error('initMap: #us-map container not found');
        mapInitAttempted = false; // Allow retry
        return;
    }

    console.log('initMap: All dependencies found, creating MapRenderer...');
    mapRenderer = new MapRenderer('us-map', CHART_DATA.mapData);
    mapRenderer.init();
}

/* ============================================
   INSIGHT BOX INTERACTION - BAR BOUNCE ON HOVER
   ============================================ */
class InsightBoxInteraction {
    constructor(chartInstances) {
        this.chartInstances = chartInstances;
        this.pulseIntervals = {};
        this.originalData = {};
        this.isReordered = {};
        this.highlightTimeouts = {};
    }

    init() {
        document.querySelectorAll('.content-box[data-highlight-bars]').forEach(box => {
            box.addEventListener('mouseenter', () => this.startHighlight(box));
            box.addEventListener('mouseleave', () => this.stopHighlight(box));
        });
        console.log('InsightBoxInteraction initialized');
    }

    startHighlight(box) {
        const chartId = box.dataset.chart;
        const barIndices = box.dataset.highlightBars.split(',').map(Number);
        const shouldReorder = box.dataset.reorder === 'true';
        const chart = this.chartInstances[chartId];

        if (!chart) {
            console.warn(`InsightBoxInteraction: Chart '${chartId}' not found`);
            return;
        }

        // Add active class to box
        box.classList.add('highlight-active');

        const dataset = chart.data.datasets[0];

        // Store original data if not already stored
        if (!this.originalData[chartId]) {
            this.originalData[chartId] = {
                labels: [...chart.data.labels],
                values: [...dataset.data],
                backgroundColor: [...dataset.backgroundColor],
                borderColor: [...dataset.borderColor],
                borderWidth: Array.isArray(dataset.borderWidth) ? [...dataset.borderWidth] : dataset.borderWidth
            };
        }

        // Get hover order from CHART_DATA if available
        let hoverOrder = null;
        if (shouldReorder && CHART_DATA) {
            const dataKey = chartId === 'chart-weather-severity' ? 'weatherSeverity' :
                chartId === 'chart-weather-volume' ? 'weatherVolume' : null;
            if (dataKey && CHART_DATA[dataKey] && CHART_DATA[dataKey].hoverOrder) {
                hoverOrder = CHART_DATA[dataKey].hoverOrder;
            }
        }

        // Clear any existing pulse animation first
        if (this.pulseIntervals[chartId]) {
            clearInterval(this.pulseIntervals[chartId]);
            delete this.pulseIntervals[chartId];
        }

        // Reorder data if needed
        if (shouldReorder && hoverOrder && !this.isReordered[chartId]) {
            this.reorderChartData(chartId, chart, hoverOrder, barIndices);
            this.isReordered[chartId] = true;
            // Wait for reorder animation to complete before starting pulse
            const reorderTimeout = setTimeout(() => {
                // Check if box is still active before starting pulse
                if (!box.classList.contains('highlight-active')) {
                    return; // Don't start if highlight was stopped
                }
                if (this.pulseIntervals[chartId]) return; // Don't start if already stopped
                this.startPulseAnimation(chartId, barIndices);
            }, 650);
            // Store timeout so we can cancel it if needed
            if (!this.highlightTimeouts) this.highlightTimeouts = {};
            this.highlightTimeouts[chartId] = reorderTimeout;
        } else {
            // Start highlight pulse animation immediately if no reorder
            this.startPulseAnimation(chartId, barIndices);
        }
    }

    reorderChartData(chartId, chart, hoverOrder, highlightIndices) {
        const dataset = chart.data.datasets[0];
        const original = this.originalData[chartId];

        // Reorder labels, values, and colors according to hoverOrder
        const newLabels = hoverOrder.map(idx => original.labels[idx]);
        const newValues = hoverOrder.map(idx => original.values[idx]);
        const newBackgroundColors = hoverOrder.map(idx => original.backgroundColor[idx]);
        const newBorderColors = hoverOrder.map(idx => original.borderColor[idx]);
        const newBorderWidths = Array.isArray(original.borderWidth)
            ? hoverOrder.map(idx => original.borderWidth[idx])
            : original.borderWidth;

        // Update chart data
        chart.data.labels = newLabels;
        dataset.data = newValues;
        dataset.backgroundColor = newBackgroundColors;
        dataset.borderColor = newBorderColors;
        dataset.borderWidth = newBorderWidths;

        // Map old indices to new positions for highlight adjustment
        const indexMap = {};
        hoverOrder.forEach((oldIdx, newIdx) => {
            indexMap[oldIdx] = newIdx;
        });

        // Store reordered data and index map
        this.originalData[chartId].reorderedLabels = newLabels;
        this.originalData[chartId].reorderedValues = newValues;
        this.originalData[chartId].reorderedBackgroundColor = newBackgroundColors;
        this.originalData[chartId].reorderedBorderColor = newBorderColors;
        this.originalData[chartId].reorderedBorderWidth = newBorderWidths;
        this.originalData[chartId].indexMap = indexMap;

        // Animate the reorder
        chart.options.animation = {
            duration: 600,
            easing: 'easeInOutQuad'
        };
        chart.update();
    }

    startPulseAnimation(chartId, barIndices) {
        const chart = this.chartInstances[chartId];
        if (!chart) return;

        const dataset = chart.data.datasets[0];
        const original = this.originalData[chartId];
        const highlightColor = '#FF8C42';
        const dimColor = 'rgba(100, 100, 100, 0.4)';

        // Adjust barIndices if chart was reordered
        let adjustedIndices = barIndices;
        if (this.isReordered[chartId] && original.indexMap) {
            adjustedIndices = barIndices.map(oldIdx => original.indexMap[oldIdx]).filter(idx => idx !== undefined);
        }

        // Get base colors from current chart state (after reorder if applicable)
        // This ensures we have the correct colors in the correct order
        const baseColors = [...dataset.backgroundColor];
        const baseBorderColors = [...dataset.borderColor];

        let phase = 0;
        this.pulseIntervals[chartId] = setInterval(() => {
            const pulse = (Math.sin(phase * 0.12) + 1) / 2;
            const brightness = 0.7 + pulse * 0.3;

            // Always use base colors, never modify them in place
            dataset.backgroundColor = baseColors.map((color, idx) => {
                if (adjustedIndices.includes(idx)) {
                    const adjusted = this.adjustColorBrightness(color, brightness);
                    return adjusted;
                } else {
                    return dimColor;
                }
            });

            dataset.borderColor = baseBorderColors.map((color, idx) => {
                if (adjustedIndices.includes(idx)) {
                    return highlightColor;
                } else {
                    return 'rgba(80, 80, 80, 0.3)';
                }
            });

            dataset.borderWidth = baseColors.map((_, i) =>
                adjustedIndices.includes(i) ? 3 : 1
            );

            chart.update('none');
            phase++;
        }, 100);
    }

    stopHighlight(box) {
        const chartId = box.dataset.chart;

        if (!chartId) return;

        box.classList.remove('highlight-active');

        // Cancel any pending highlight timeouts
        if (this.highlightTimeouts && this.highlightTimeouts[chartId]) {
            clearTimeout(this.highlightTimeouts[chartId]);
            delete this.highlightTimeouts[chartId];
        }

        // Stop pulse animation immediately - ensure it's cleared
        if (this.pulseIntervals[chartId]) {
            clearInterval(this.pulseIntervals[chartId]);
            delete this.pulseIntervals[chartId];
        }

        const chart = this.chartInstances[chartId];
        if (!chart || !this.originalData[chartId]) {
            // Even if chart/data not found, ensure pulse is stopped
            return;
        }

        const dataset = chart.data.datasets[0];
        const original = this.originalData[chartId];

        // Restore original order and colors immediately
        if (this.isReordered[chartId]) {
            chart.data.labels = [...original.labels];
            dataset.data = [...original.values];
            dataset.backgroundColor = [...original.backgroundColor];
            dataset.borderColor = [...original.borderColor];
            dataset.borderWidth = Array.isArray(original.borderWidth)
                ? [...original.borderWidth]
                : original.borderWidth;

            // Animate back to original order
            chart.options.animation = {
                duration: 600,
                easing: 'easeInOutQuad'
            };
            chart.update();
            this.isReordered[chartId] = false;
        } else {
            // Just restore colors immediately without animation
            dataset.backgroundColor = [...original.backgroundColor];
            dataset.borderColor = [...original.borderColor];
            dataset.borderWidth = Array.isArray(original.borderWidth)
                ? [...original.borderWidth]
                : original.borderWidth;
            chart.update('none');
        }

        // Force a final update to ensure state is clean
        setTimeout(() => {
            if (this.pulseIntervals[chartId]) {
                clearInterval(this.pulseIntervals[chartId]);
                delete this.pulseIntervals[chartId];
            }
            if (chart && dataset && original) {
                dataset.backgroundColor = [...original.backgroundColor];
                dataset.borderColor = [...original.borderColor];
                dataset.borderWidth = Array.isArray(original.borderWidth)
                    ? [...original.borderWidth]
                    : original.borderWidth;
                chart.update('none');
            }
        }, 100);
    }

    adjustColorBrightness(color, factor) {
        if (!color || typeof color !== 'string') return color;

        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 6) {
                const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.substr(0, 2), 16) * factor)));
                const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.substr(2, 2), 16) * factor)));
                const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.substr(4, 2), 16) * factor)));
                return `rgb(${r}, ${g}, ${b})`;
            }
        } else if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                const r = Math.min(255, Math.max(0, Math.round(parseInt(match[0]) * factor)));
                const g = Math.min(255, Math.max(0, Math.round(parseInt(match[1]) * factor)));
                const b = Math.min(255, Math.max(0, Math.round(parseInt(match[2]) * factor)));
                // Preserve alpha if present
                if (color.includes('rgba') && match.length >= 4) {
                    return `rgba(${r}, ${g}, ${b}, ${match[3]})`;
                }
                return `rgb(${r}, ${g}, ${b})`;
            }
        }
        return color;
    }
}

// Global insight box interaction instance
let insightBoxInteraction = null;

/* ============================================
   APPLICATION INITIALIZATION
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
    // Mark that JavaScript has loaded (for CSS rules)
    document.body.classList.add('js-loaded');

    // Initialize background images
    initBackgroundImages();

    // Render timeline first so LineAnimator can calculate positions
    renderTimeline();

    // Initialize presentation engine
    const engine = new SlideEngine({
        navigation: {
            keyboard: true,
            touch: true,
            mouse: false,
            loop: false
        },
        progress: {
            type: 'bar',
            position: 'bottom'
        },
        transitions: {
            type: 'fade',
            duration: 400,
            easing: 'ease-out'
        },
        animations: {
            enabled: true,
            staggerDelay: 100,
            countUpDuration: 2000
        }
    });
    engine.init();

    // Initialize SlideScaler for auto-fit content
    const slideScaler = new SlideScaler();
    slideScaler.init();

    // Initialize LineAnimator and connect to SlideEngine
    const lineAnimator = new LineAnimator(engine);
    engine.lineAnimator = lineAnimator;
    lineAnimator.init();

    // Listen for slide changes to initialize charts
    document.addEventListener('slidechange', (e) => {
        const slideIndex = e.detail.current;
        initSlideContent(slideIndex);
    });

    // Initialize first slide content
    initSlideContent(0);

    // Initialize insight box interaction for chart hover effects
    insightBoxInteraction = new InsightBoxInteraction(chartInstances);
    insightBoxInteraction.init();

    // Map initialization handled by inline script in index.html
    // setTimeout(() => { initMap(); }, 500);

    // Initialize Fullscreen Notice
    initFullscreenNotice();

    console.log('US Traffic Accident Analysis Presentation loaded successfully');
});

/* ============================================
   FULLSCREEN NOTICE MANAGER
   ============================================ */
/* ============================================
   FULLSCREEN NOTICE MANAGER
   ============================================ */
function initFullscreenNotice() {
    const notice = document.getElementById('fullscreen-notice');
    const btnGo = document.getElementById('btn-go-fullscreen');
    const btnDismiss = document.getElementById('btn-dismiss-notice');

    if (!notice || !btnGo || !btnDismiss) return;

    // Helper to show notice (Full or Minimized based on history)
    const showNotice = () => {
        // Remove display:none if set
        if (notice.style.display === 'none') {
            notice.style.display = 'block';
        }

        requestAnimationFrame(() => {
            if (!document.fullscreenElement && !isF11Fullscreen()) {
                // If previously dismissed, show as minimized
                if (sessionStorage.getItem('fullscreen-notice-dismissed') === 'true') {
                    notice.classList.add('minimized');
                } else {
                    notice.classList.remove('minimized');
                }
                notice.classList.add('show');
            }
        });
    };

    // Helper to hide notice fully (when in fullscreen)
    const hideNotice = () => {
        notice.classList.remove('show');
        // We don't set display:none here because we want quick re-appearance
    };

    // Helper to minimize (when dismissed)
    const minimizeNotice = (e) => {
        e.stopPropagation(); // Prevent triggering maximize logic immediately
        notice.classList.add('minimized');
        sessionStorage.setItem('fullscreen-notice-dismissed', 'true');
    };

    const triggerFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    }

    // Helper to detect F11 fullscreen (heuristic)
    const isF11Fullscreen = () => {
        return window.innerWidth === screen.width && window.innerHeight === screen.height;
    };

    // Initial check - show after delay
    setTimeout(() => {
        if (!document.fullscreenElement && !isF11Fullscreen()) {
            // Force show on initial load - reset any previous session dismissal
            sessionStorage.removeItem('fullscreen-notice-dismissed');
            notice.classList.remove('minimized');
            showNotice();
        }
    }, 2000);

    // Go Fullscreen Button
    btnGo.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerFullscreen();
    });

    // Dismiss Button -> Minimize
    btnDismiss.addEventListener('click', minimizeNotice);

    // Clicking the minimized notice -> Go Fullscreen
    notice.addEventListener('click', (e) => {
        if (notice.classList.contains('minimized')) {
            triggerFullscreen();
        }
    });

    // Listen for API fullscreen changes
    const handleStateChange = () => {
        const isApiFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement ||
            document.mozFullScreenElement || document.msFullscreenElement);
        const isF11 = isF11Fullscreen();

        if (isApiFullscreen || isF11) {
            // Entered fullscreen - hide entirely immediately to prevent artifacts
            notice.style.transition = 'none';
            notice.classList.remove('show');
            notice.classList.remove('minimized');

            // Force reflow
            void notice.offsetWidth;

            // Restore transition after small delay
            setTimeout(() => {
                notice.style.transition = '';
            }, 50);
        } else {
            // Exited fullscreen - Show main notice again (reset state logic)
            sessionStorage.removeItem('fullscreen-notice-dismissed');
            notice.classList.remove('minimized');
            showNotice();
        }
    };

    // Event Listeners
    document.addEventListener('fullscreenchange', handleStateChange);
    document.addEventListener('webkitfullscreenchange', handleStateChange);
    document.addEventListener('mozfullscreenchange', handleStateChange);
    document.addEventListener('MSFullscreenChange', handleStateChange);

    // Resize listener for F11 detection
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleStateChange, 100);
    });
}
