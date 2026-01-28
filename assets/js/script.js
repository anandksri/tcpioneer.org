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

const patternElement = document.getElementById("pattern");
const gradientElement = document.getElementById("gradient");
const gradient2Element = document.getElementById("gradient2");

// Violet outline-only hex SVG
const hexSVG = `
<svg width="87" height="100" viewBox="0 0 87 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2.2 26.15L43.5 2.3L84.8 26.15V73.85L43.5 97.7L2.2 73.85V26.15Z"
        stroke="rgba(139,92,246,0.7)"
        stroke-width="1.6"
        fill="none"/>
</svg>
`;

const encodedHex = `data:image/svg+xml;base64,${btoa(hexSVG)}`;

function createPattern() {
    patternElement.innerHTML = "";

    const hexWidth = 65;
    const hexHeight = 55;
    const buffer = 4; // overscan

    const countY = Math.ceil(window.innerHeight / hexHeight) + buffer;
    const countX = Math.ceil(window.innerWidth / hexWidth) + buffer;

    for (let i = 0; i < countY; i++) {
        for (let j = 0; j < countX; j++) {
            const hexagon = document.createElement("div");

            hexagon.style.position = "absolute";
            hexagon.style.width = "56px";
            hexagon.style.height = "64px";
            hexagon.style.background = `url('${encodedHex}') no-repeat`;
            hexagon.style.backgroundSize = "contain";
            hexagon.style.opacity = "0.75";

            const offsetX = (i % 2) * (hexWidth / 2);

            hexagon.style.top = `${(i - 2) * (hexHeight - 5)}px`;
            hexagon.style.left = `${(j - 2) * hexWidth + offsetX}px`;

            patternElement.appendChild(hexagon);
        }
    }
}

createPattern();
window.addEventListener("resize", createPattern);

// Seamless ambient animation
let t = 0;

function animateBackground() {
    const driftX = Math.sin(t * 0.001) * 40;
    const driftY = Math.cos(t * 0.0012) * 30;

    const glow1X = Math.sin(t * 0.0008) * 120;
    const glow1Y = Math.cos(t * 0.0006) * 100;

    const glow2X = Math.cos(t * 0.0004) * 180;
    const glow2Y = Math.sin(t * 0.0003) * 140;

    patternElement.style.transform = `translate(${driftX}px, ${driftY}px)`;

    gradientElement.style.transform = `translate(calc(-50% + ${glow1X}px), calc(-50% + ${glow1Y}px))`;
    gradient2Element.style.transform = `translate(calc(-50% + ${glow2X}px), calc(-50% + ${glow2Y}px))`;

    t++;
    requestAnimationFrame(animateBackground);
}

animateBackground();


// navbar 
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");
const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
const navItems = navLinks.querySelectorAll("a");

// Hamburger toggle
hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

// Dropdown toggle (mobile)
dropdownToggles.forEach(toggle => {
    toggle.addEventListener("click", (e) => {
        if (window.innerWidth <= 900) {
            e.preventDefault();
            toggle.parentElement.classList.toggle("active");
        }
    });
});

// Auto close menu ONLY for real links (not dropdown toggles)
navItems.forEach(link => {
    link.addEventListener("click", () => {
        if (
            window.innerWidth <= 900 &&
            !link.classList.contains("dropdown-toggle")
        ) {
            navLinks.classList.remove("active");
        }
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

    const text1 = "Securing the Future";
    const text2 = "Through Education";

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
const shield = document.querySelector(".cyber-shield");

document.addEventListener("mousemove", (e) => {
    const x = (window.innerWidth / 2 - e.clientX) / 25;
    const y = (window.innerHeight / 2 - e.clientY) / 25;

    shield.style.transform = `
    rotateY(${x}deg)
    rotateX(${y}deg)
    translateY(-12px)
  `;
});

// collaboration scroll animation
const track = document.getElementById("partnerTrack");
let speed = 0.4;
let paused = false;

// Duplicate items for infinite loop
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

// join us page - FAQ accordion
function toggleFAQ(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('.fa-chevron-down');

  content.classList.toggle('hidden');
  icon.classList.toggle('rotate-180');
}