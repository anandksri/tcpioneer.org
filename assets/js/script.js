// tailwind config
tailwind.config = {
    theme: {
        extend: {
            colors: {
                cyber: '#8b5cf6',
                darkbg: '#050508'
            }
        }
    }
}
// hex pattern background
const patternElement = document.getElementById("pattern");

/* ===== HEX SVG ===== */
const hexSVG = `
<svg width="87" height="100" viewBox="0 0 87 100" fill="none"
 xmlns="http://www.w3.org/2000/svg">
  <path d="M2.2 26.15L43.5 2.3L84.8 26.15V73.85L43.5 97.7L2.2 73.85V26.15Z"
        stroke="rgba(138, 92, 246, 0.37)"
        stroke-width="1.4"  
        fill="none"/>
</svg>
`;

const encodedHex = `data:image/svg+xml;base64,${btoa(hexSVG)}`;

let hexElements = [];

/* ===== CREATE GRID ===== */
function createPattern() {
    patternElement.innerHTML = "";
    hexElements = [];

    const hexWidth = 70;
    const hexHeight = 60;
    const buffer = 4;

    const countY = Math.ceil(window.innerHeight / hexHeight) + buffer;
    const countX = Math.ceil(window.innerWidth / hexWidth) + buffer;

    for (let i = 0; i < countY; i++) {
        for (let j = 0; j < countX; j++) {

            const hex = document.createElement("div");

            hex.style.position = "absolute";
            hex.style.width = "60px";
            hex.style.height = "70px";
            hex.style.background = `url('${encodedHex}') no-repeat`;
            hex.style.backgroundSize = "contain";
            hex.style.opacity = "0.25";
            hex.style.transition = "all 0.1s ease-out";

            const offsetX = (i % 2) * (hexWidth / 2);
            const top = (i - 2) * (hexHeight - 8);
            const left = (j - 2) * hexWidth + offsetX;

            hex.style.top = `${top}px`;
            hex.style.left = `${left}px`;

            patternElement.appendChild(hex);

            hexElements.push({
                el: hex,
                centerX: left + 30,
                centerY: top + 35
            });
        }
    }
}

createPattern();
window.addEventListener("resize", createPattern);

/* ===== MOUSE INTERACTION ===== */
let mouseX = -9999;
let mouseY = -9999;

window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function animateHexInteraction() {
    hexElements.forEach(hex => {
        const dx = mouseX - hex.centerX;
        const dy = mouseY - hex.centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 180;

        if (distance < maxDistance) {
            const intensity = 1 - (distance / maxDistance);

            // Add blinking class
            hex.el.classList.add("blink");

            // Scale and shadow effect
            hex.el.style.transform = `scale(${1 + intensity * 0.5})`;
            hex.el.style.filter =
                `drop-shadow(0 0 ${25 * intensity}px rgba(139,92,246,0.9))`;
        } else {
            // Remove blink effect
            hex.el.classList.remove("blink");
            hex.el.style.opacity = 0.25;
            hex.el.style.transform = "scale(1)";
            hex.el.style.filter = "none";
        }
    });

    requestAnimationFrame(animateHexInteraction);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    animateHexInteraction();
}

// navbar 
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");
const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
const mobileNavQuery = window.matchMedia("(max-width: 900px)");
const navItems = navLinks.querySelectorAll("a:not(.dropdown-toggle)");

function setMenuOpen(isOpen) {
    navLinks.classList.toggle("active", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
    hamburger.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    navLinks.inert = mobileNavQuery.matches && !isOpen;

    if (!isOpen) {
        dropdownToggles.forEach(toggle => {
            toggle.parentElement.classList.remove("active");
            toggle.setAttribute("aria-expanded", "false");
        });
    }
}

setMenuOpen(false);

hamburger.addEventListener("click", () => {
    setMenuOpen(hamburger.getAttribute("aria-expanded") !== "true");
});

dropdownToggles.forEach(toggle => {
    toggle.addEventListener("click", event => {
        if (toggle.matches("a")) {
            event.preventDefault();
        }

        const isOpen = toggle.parentElement.classList.toggle("active");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });
});

navItems.forEach(link => {
    link.addEventListener("click", () => {
        if (mobileNavQuery.matches) {
            setMenuOpen(false);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (mobileNavQuery.matches && hamburger.getAttribute("aria-expanded") === "true") {
            setMenuOpen(false);
            hamburger.focus();
        }

        dropdownToggles.forEach(toggle => {
            toggle.parentElement.classList.remove("active");
            toggle.setAttribute("aria-expanded", "false");
        });
    }
});

mobileNavQuery.addEventListener("change", () => {
    setMenuOpen(false);
    dropdownToggles.forEach(toggle => {
        toggle.parentElement.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
    });
});


// hero section animation 
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

function hackerReveal(element, finalText, speed = 40, revealSpeed = 2, callback = null) {
    let iterations = 0;

    const interval = setInterval(() => {
        element.textContent = finalText
            .split("")
            .map((char, index) => {
                if (index < iterations) {
                    return finalText[index];
                }
                return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");

        if (iterations >= finalText.length) {
            clearInterval(interval);
            element.textContent = finalText;
            if (callback) callback();
        }

        iterations += 1 / revealSpeed;
    }, speed);
}

window.addEventListener("load", () => {
    const line1 = document.getElementById("type-line-1");
    const line2 = document.getElementById("type-line-2");

    if (!line1 || !line2) {
        return;
    }

    const text1 = "Securing the Future";
    const text2 = "Through Education";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        line1.textContent = text1;
        line2.textContent = text2;
        return;
    }

    hackerReveal(line1, text1, 35, 2, () => {
        setTimeout(() => {
            hackerReveal(line2, text2, 35, 2);
        }, 300);
    });
});
// tailwind config
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                tesla: ['Tesla', 'sans-serif'],
            }
        }
    }
}

// footer date update
document.getElementById("year").textContent = new Date().getFullYear();

//  shield animation
const shield = document.querySelector(".shield-visual");

if (
    shield &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
    document.addEventListener("pointermove", e => {
        const x = (window.innerWidth / 2 - e.clientX) / 25;
        const y = (window.innerHeight / 2 - e.clientY) / 25;
        shield.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    });

    document.addEventListener("pointerleave", () => {
        shield.style.transform = "";
    });
}

// collaboration scroll animation
const track = document.getElementById("partnerTrack");
if (track) {
    let speed = 0.4;
    let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    track.innerHTML += track.innerHTML;

    let x = 0;

    function loop() {
        if (!paused) {
            x -= speed;

            if (Math.abs(x) >= track.scrollWidth / 2) {
                x = 0;
            }

            track.style.transform = `translateX(${x}px)`;
        }
        requestAnimationFrame(loop);
    }

    loop();

    track.addEventListener("mouseenter", () => paused = true);
    track.addEventListener("mouseleave", () => paused = false);
}

// join us page - FAQ accordion
function toggleFAQ(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('.fa-chevron-down');

  content.classList.toggle('hidden');
  icon.classList.toggle('rotate-180');
}