// LevelUp Digital - Main JavaScript

// Manage CTA buttons: Remove from DOM based on screen size
// - Tablet/Mobile: Remove header CTA, keep floating CTA
// - Desktop: Remove floating CTA, keep header CTA
// - Contact page: Never show floating CTA (form is already on the page)
function manageCTAButtons() {
  const isMobileOrTablet = window.innerWidth <= 1024;
  const headerContent = document.querySelector('.header-content');
  const body = document.body;
  
  // Check if we're on the contact page (check for contact form or contact page URL)
  const isContactPage = document.getElementById('contact-page-form') !== null ||
                        window.location.pathname.includes('contact.html') ||
                        window.location.pathname.endsWith('/contact') ||
                        window.location.pathname.endsWith('/contact/');
  
  // Get or create button references
  let headerCTA = document.querySelector('.header-content .btn-nav-modal');
  let floatingCTA = document.querySelector('.btn-nav-modal-mobile');
  
  if (isMobileOrTablet) {
    // Tablet/Mobile: Remove header CTA, ensure floating CTA exists (except on contact page)
    if (headerCTA && headerCTA.parentNode) {
      headerCTA.remove();
    }
    
    // Create floating CTA if it doesn't exist (but not on contact page)
    if (!floatingCTA && !isContactPage) {
      floatingCTA = document.createElement('button');
      floatingCTA.className = 'btn-nav-modal-mobile';
      floatingCTA.setAttribute('onclick', 'openProjectModal()');
      floatingCTA.setAttribute('aria-label', 'Start a Project');
      floatingCTA.textContent = 'Start a Project';
      body.appendChild(floatingCTA);
    }
    
    // Remove floating CTA if we're on contact page
    if (isContactPage && floatingCTA && floatingCTA.parentNode) {
      floatingCTA.remove();
    }
  } else {
    // Desktop: Remove floating CTA, ensure header CTA exists
    if (floatingCTA && floatingCTA.parentNode) {
      floatingCTA.remove();
    }
    
    // Create header CTA if it doesn't exist
    if (!headerCTA && headerContent) {
      headerCTA = document.createElement('button');
      headerCTA.className = 'btn-nav-modal';
      headerCTA.setAttribute('onclick', 'openProjectModal()');
      headerCTA.textContent = 'Start a Project';
      headerContent.appendChild(headerCTA);
    }
  }
}

// Run on load and resize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', manageCTAButtons);
} else {
  manageCTAButtons();
}

let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(manageCTAButtons, 100);
}, { passive: true });

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  const body = document.body;
  
  function closeMenu() {
    nav.classList.remove('active');
    navToggle.classList.remove('active');
    body.style.overflow = '';
  }
  
  function openMenu() {
    nav.classList.add('active');
    navToggle.classList.add('active');
    body.style.overflow = 'hidden';
  }
  
  if (navToggle && nav) {
    navToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      if (nav.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (nav.classList.contains('active')) {
        const isClickInsideNav = nav.contains(e.target);
        const isClickOnToggle = navToggle.contains(e.target);
        
        if (!isClickInsideNav && !isClickOnToggle) {
          closeMenu();
        }
      }
    });

    // Close menu when clicking on nav links
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        closeMenu();
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        closeMenu();
      }
    });
  }
  
  // FAQ Toggle
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      const faqItem = this.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      // Close all FAQ items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Open clicked item if it wasn't active
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });
  
  // Contact Form Handling
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      // Get form data
      const formData = new FormData(this);
      const data = Object.fromEntries(formData);
      
      // Simple validation
      if (!data.name || !data.email || !data.message) {
        e.preventDefault();
        alert('Please fill in all required fields.');
        return false;
      }
      
      // If Netlify form, let it handle submission naturally
      // The action attribute will handle redirect after successful submission
      if (this.hasAttribute('netlify')) {
        // Let Netlify handle the submission - don't prevent default
        return true;
      }
      
      // For local testing without Netlify, prevent default and redirect
      e.preventDefault();
      window.location.href = '/thank-you.html';
      return false;
    });
  }

  // Floating CTA Button Logic
  const floatingCTA = document.querySelector('.btn-nav-modal-mobile');
  const headerCTA = document.querySelector('.header-content .btn-nav-modal');
  
  if (floatingCTA) {
    let isMobile = window.innerWidth <= 768;
    let scrollThreshold = 200;
    let isScrolledPastThreshold = false;
    let mainCTAInView = false;

    // Function to check if main CTA is visible
    function checkMainCTAVisibility() {
      if (!headerCTA) {
        mainCTAInView = false;
        return;
      }

      const rect = headerCTA.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.top <= window.innerHeight && 
                       rect.left >= 0 && rect.left <= window.innerWidth;
      mainCTAInView = isVisible;
    }

    // Use IntersectionObserver for better performance
    let observer = null;
    if (headerCTA && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          mainCTAInView = entry.isIntersecting;
          updateFloatingCTA();
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px'
      });
      observer.observe(headerCTA);
    }

    // Function to update floating CTA visibility
    function updateFloatingCTA() {
      if (!isMobile) {
        floatingCTA.classList.remove('visible');
        return;
      }

      // On mobile: show if scrolled past threshold AND main CTA is not visible
      if (isScrolledPastThreshold && !mainCTAInView) {
        floatingCTA.classList.add('visible');
      } else {
        floatingCTA.classList.remove('visible');
      }
    }

    // Handle scroll
    function handleScroll() {
      isScrolledPastThreshold = window.scrollY >= scrollThreshold;
      
      // Fallback: check main CTA visibility on scroll if no observer
      if (!observer) {
        checkMainCTAVisibility();
      }
      
      updateFloatingCTA();
    }

    // Handle resize
    function handleResize() {
      const wasMobile = isMobile;
      isMobile = window.innerWidth <= 768;
      
      // If switching between mobile/desktop, update immediately
      if (wasMobile !== isMobile) {
        updateFloatingCTA();
      }
    }

    // Initial check
    checkMainCTAVisibility();
    handleScroll();

    // Event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Initial state
    updateFloatingCTA();
  }
});

// Project Inquiry Modal Functions
function openProjectModal() {
  const modal = document.getElementById('projectModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Hide floating CTA when modal is open
    const floatingCTA = document.querySelector('.btn-nav-modal-mobile');
    if (floatingCTA) {
      floatingCTA.classList.remove('visible');
    }
  }
}

function closeProjectModal() {
  const modal = document.getElementById('projectModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form if it was submitted
    const form = document.getElementById('project-inquiry-form');
    const success = document.getElementById('form-success');
    if (form && success) {
      form.style.display = 'block';
      success.style.display = 'none';
      form.reset();
      
      // Clear any error messages
      const errorMessages = form.querySelectorAll('.error-message');
      errorMessages.forEach(error => error.remove());
      const errorInputs = form.querySelectorAll('.error');
      errorInputs.forEach(input => input.classList.remove('error'));
    }
    
    // Re-evaluate floating CTA visibility after modal closes
    // Trigger a scroll event to update visibility
    setTimeout(() => {
      window.dispatchEvent(new Event('scroll'));
    }, 100);
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeProjectModal();
  }
});

// Project Inquiry Form Handling (Modal)
document.addEventListener('DOMContentLoaded', function() {
  const projectForm = document.getElementById('project-inquiry-form');
  console.log('Project form found:', projectForm);
  
  if (projectForm) {
    // Remove any existing error messages
    function clearErrors() {
      const errorMessages = projectForm.querySelectorAll('.error-message');
      errorMessages.forEach(error => error.remove());
      const errorInputs = projectForm.querySelectorAll('.error');
      errorInputs.forEach(input => input.classList.remove('error'));
    }

    // Show error message for a field
    function showError(input, message) {
      if (!input) return;
      
      // Don't clear all errors - show all errors at once
      input.classList.add('error');
      
      // Remove existing error for this field
      const existingError = input.parentElement.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = message;
      errorDiv.setAttribute('role', 'alert');
      input.parentElement.appendChild(errorDiv);
    }

    // Validate required fields
    function validateForm() {
      clearErrors();
      
      const name = projectForm.querySelector('#name');
      const email = projectForm.querySelector('#email');
      const businessType = projectForm.querySelector('#business-type');
      
      let isValid = true;
      let firstErrorField = null;

      // Validate name
      if (!name || !name.value.trim()) {
        showError(name, 'Name is required');
        isValid = false;
        if (!firstErrorField) firstErrorField = name;
      }

      // Validate email
      if (!email || !email.value.trim()) {
        showError(email, 'Email is required');
        isValid = false;
        if (!firstErrorField) firstErrorField = email;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, 'Please enter a valid email address');
        isValid = false;
        if (!firstErrorField) firstErrorField = email;
      }

      // Validate business type
      if (!businessType || !businessType.value) {
        showError(businessType, 'Business type is required');
        isValid = false;
        if (!firstErrorField) firstErrorField = businessType;
      }

      // Focus on first error field
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return isValid;
    }

    projectForm.addEventListener('submit', function(e) {
      console.log('Form submit event triggered');
      
      // Clear previous errors
      clearErrors();
      
      // Validate form
      if (!validateForm()) {
        console.log('Form validation failed');
        e.preventDefault();
        return false;
      }
      
      console.log('Form validation passed, submitting to Netlify...');
      
      // Disable submit button to prevent double submission
      const submitButton = projectForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton ? submitButton.textContent : '';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }
      
      // Let the form submit naturally to Netlify
      // Netlify will handle the submission and redirect
      // We'll intercept the response to show success message
      
      // Create a hidden iframe to capture the form submission response
      const formAction = this.action || window.location.pathname;
      
      // For Netlify forms, we can use AJAX submission but need to handle the response
      // Netlify returns HTML, so we need to check for success indicators
      const formData = new FormData(this);
      
      fetch(formAction, {
        method: 'POST',
        body: formData
      })
      .then((response) => {
        console.log('Response status:', response.status);
        return response.text().then(html => {
          // Check if submission was successful
          // Netlify typically returns a page with "Thank you" or similar
          if (response.ok && (html.includes('Thank you') || html.includes('success') || response.status === 200)) {
            // Show success message
            const form = document.getElementById('project-inquiry-form');
            const success = document.getElementById('form-success');
            if (form && success) {
              form.style.display = 'none';
              success.style.display = 'block';
              // Scroll to success message
              success.scrollIntoView({ behavior: 'smooth', block: 'center' });
              console.log('Success message displayed');
            }
            return true;
          } else {
            throw new Error('Form submission may have failed');
          }
        });
      })
      .catch((error) => {
        console.error('Form submission error:', error);
        
        // Re-enable submit button
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
        
        // Still show success if we got a 200 response (Netlify might have processed it)
        // But show error for other cases
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message form-error';
        errorDiv.textContent = 'There was an error submitting your form. Please try again or contact me directly.';
        errorDiv.setAttribute('role', 'alert');
        projectForm.insertBefore(errorDiv, projectForm.firstChild);
      });
      
      // Prevent default to handle submission via fetch
      e.preventDefault();
    });
  }

  // Contact Page Form Handling
  const contactPageForm = document.getElementById('contact-page-form');
  if (contactPageForm) {
    // Remove any existing error messages
    function clearErrors() {
      const errorMessages = contactPageForm.querySelectorAll('.error-message');
      errorMessages.forEach(error => error.remove());
      const errorInputs = contactPageForm.querySelectorAll('.error');
      errorInputs.forEach(input => input.classList.remove('error'));
    }

    // Show error message for a field
    function showError(input, message) {
      clearErrors();
      input.classList.add('error');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = message;
      errorDiv.setAttribute('role', 'alert');
      input.parentElement.appendChild(errorDiv);
      input.focus();
    }

    // Validate required fields
    function validateForm() {
      const name = contactPageForm.querySelector('#contact-name');
      const email = contactPageForm.querySelector('#contact-email');
      const businessType = contactPageForm.querySelector('#contact-business-type');
      
      let isValid = true;

      // Validate name
      if (!name || !name.value.trim()) {
        showError(name, 'Name is required');
        isValid = false;
      }

      // Validate email
      if (!email || !email.value.trim()) {
        showError(email, 'Email is required');
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, 'Please enter a valid email address');
        isValid = false;
      }

      // Validate business type
      if (!businessType || !businessType.value) {
        showError(businessType, 'Business type is required');
        isValid = false;
      }

      return isValid;
    }

    contactPageForm.addEventListener('submit', function(e) {
      // Clear previous errors
      clearErrors();
      
      // Validate form
      if (!validateForm()) {
        e.preventDefault();
        return false;
      }
      
      // Disable submit button to prevent double submission
      const submitButton = contactPageForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton ? submitButton.textContent : '';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }
      
      const formData = new FormData(this);
      
      // Submit to Netlify using fetch (AJAX submission)
      fetch('/', {
        method: 'POST',
        body: formData
      })
      .then((response) => {
        return response.text().then(html => {
          // Netlify returns HTML response, check for success
          if (response.ok) {
            // Show success message
            const form = document.getElementById('contact-page-form');
            const success = document.getElementById('contact-form-success');
            if (form && success) {
              form.style.display = 'none';
              success.style.display = 'block';
              // Scroll to success message
              success.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return true;
          } else {
            throw new Error('Form submission failed');
          }
        });
      })
      .catch((error) => {
        console.error('Form submission error:', error);
        
        // Re-enable submit button
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message form-error';
        errorDiv.textContent = 'There was an error submitting your form. Please try again or contact me directly.';
        errorDiv.setAttribute('role', 'alert');
        contactPageForm.insertBefore(errorDiv, contactPageForm.firstChild);
      });
      
      // Prevent default to handle submission via fetch
      e.preventDefault();
    });
  }
});

