// script.js
// Extra features, transitions, and tools for geeta.html


import hrUrl, { launchConfetti } from './confetti.js';

const urlParams = new URLSearchParams(window.location.search);
let chapterParam = urlParams.get('chapter');

chapterParam ? localStorage.setItem('currentChapter', chapterParam) : chapterParam = '1';

let isVersePlaying = false;
// Share the verse using Web Share API or fallback
function shareVerse(text) {
    if (navigator.share) {
        navigator.share({ text });
    } else {
        prompt('Copy and share this verse:', text);
    }
}

// Copy verse text to clipboard
function copyVerse(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `Copied!`;
        btn.style.background = '#ff5e62';
        btn.style.color = '#fff';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '#eee';
            btn.style.color = '#333';
        }, 1500);
    }, () => {
        alert('Failed to copy.');
    });
}

// Toggle favorite for a verse
function toggleFavorite(verseNum, btn) {
    const favs = JSON.parse(localStorage.getItem('favVerses') || '[]');
    const isFav = favs.includes(verseNum);
    if (isFav) {
        btn.innerHTML = '<span class="material-symbols-rounded">star_outline</span>';
        btn.style.color = '#bbb';
        localStorage.setItem('favVerses', JSON.stringify(favs.filter(v => v !== verseNum)));
    } else {
        btn.innerHTML = '<span class="material-symbols-rounded">star</span>';
        btn.style.color = '#ff5e62';
        favs.push(verseNum);
        localStorage.setItem('favVerses', JSON.stringify(favs));
        launchConfetti(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
    }
}


// Show only favorite verses
function showFavorites(allVerses, renderVerses) {
    const favs = JSON.parse(localStorage.getItem('favVerses')||'[]');
    if (favs.length === 0) {
        const versesContainer = document.getElementById('verses-container');
        versesContainer.innerHTML = `<div class="info-message">You haven't favorited any verses yet. Click the ☆ icon on a verse to save it here.</div>`;
        return;
    }
    const favVerses = allVerses.filter(v => {
        const num = v.text.match(/\d+\.\d+/) || v.text.match(/\d+/);
        return num && favs.includes(num[0]);
    });
    renderVerses(favVerses, true); // Pass true to indicate a filtered view
}


// Close favorites and show all verses
function closeFavorites(allVerses, renderVerses) {
    const chapterNav = document.getElementById('chapter-nav');
    filterChapter(parseInt(chapterNav.value), allVerses, renderVerses);
}


let isFavOpen = false;

document.addEventListener("DOMContentLoaded", () => {
    history.replaceState({}, '', '');
    // Animate header text with letter-by-letter effect (with .animated class for CSS)
    const header = document.querySelector("header h1");
    if (header) {
        const text = header.textContent;
        header.textContent = "";
        text.split("").forEach((char, i) => {
            const span = document.createElement("span");
            span.innerHTML = char === " " ? " " : char;
            span.style.opacity = 0;
            span.style.display = "inline-block";
            span.style.transform = "translateY(-30px) scale(0.8) rotate(-10deg)";
            header.appendChild(span);
            setTimeout(() => {
                span.classList.add('animated');
                span.style.opacity = 1;
                span.style.transform = "translateY(0) scale(1) rotate(0deg)";
            }, 60 * i);
        });
    }

    // Animate subtitle
    const subtitle = document.querySelector("header h2");
    if (subtitle) {
        subtitle.classList.remove('visible');
        setTimeout(() => {
            subtitle.classList.add('visible');
        }, 1200);
    }

    // Tool: Scroll to Top Button with bounce effect
    const scrollBtn = document.querySelector('.scroll-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollBtn.style.display = 'flex';
            scrollBtn.style.opacity = 1;
        } else {
            scrollBtn.style.opacity = 0;
            setTimeout(() => { if (window.scrollY < 200) scrollBtn.style.display = 'none'; }, 300);
        }
    });
    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollBtn.classList.add('spin');
        setTimeout(()=>scrollBtn.classList.remove('spin'), 800);
    };
    // Add CSS for bounce/spin
    const style = document.createElement('style');
    style.textContent = `
    .scroll-to-top.spin { animation: spinBtn 0.8s; }
    @keyframes spinBtn { 0%{transform:rotate(0);} 100%{transform:rotate(360deg);} }
    .verse:hover { box-shadow:0 4px 24px #ff5e6233; transform:scale(1.015); transition:box-shadow 0.3s,transform 0.3s; }
    .verse .share-btn { opacity:0.7; transition:opacity 0.2s; }
    .verse .share-btn:hover { opacity:1; }
    `;
    document.head.appendChild(style);

    // Tool: Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            const btn = document.querySelector('.random-verse-btn');
            if (btn) btn.click();
        }
        if (e.key === 'd' && e.ctrlKey) {
            e.preventDefault();
            const modeBtn = document.querySelector('.mode-toggle-btn');
            if (modeBtn) modeBtn.click();
        }
    });

    // Tool: Animated Verse Reveal & Audio, plus hover, share, keyboard nav
    const versesContainer = document.getElementById('verses-container');
    const loadingDiv = document.getElementById('loading');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('search-input');
    let allVerses = [];
    let allMeans = [];
    let nightMode = localStorage.getItem('nightMode') === 'true'; // Load preference
    // Fetch verses and translations from JSON
    Promise.all([
        fetch('gita/verse.json').then(res => res.json()),
        fetch('gita/translation.json').then(res => res.json()),
        fetch('gita/data/chapters.json').then(res => res.json()),
        fetch('gita/commentary.json').then(res => res.json())
    ]).then(([verseData, translationData, chapterData, commentaryData]) => {
        allVerses = verseData.filter(v => v.text);
        window.allVerses = allVerses; // Expose for external use
        window.allTranslations = translationData;
        window.allChapters = chapterData;
        window.hinMeans = commentaryData;
        
        const lastChapter = localStorage.getItem('currentChapter') || '1';
        const chapterNav = document.getElementById('chapter-nav');
        if (chapterNav) chapterNav.value = lastChapter;
        
        filterChapter(parseInt(lastChapter), allVerses, renderVerses);

        if (loadingDiv) loadingDiv.style.display = 'none';
    }).catch(err => {
        if (loadingDiv) loadingDiv.textContent = 'Failed to load verses.';
    });

    // --- Random Verse Button ---
    const randomBtn = document.createElement('button');
    randomBtn.textContent = '🎲';
    randomBtn.className = 'random-verse-btn';
    randomBtn.title = "Show a Random Verse (Ctrl+R)";
    randomBtn.style.marginLeft = '1rem';
    randomBtn.style.padding = '0.8rem 1.2rem';
    randomBtn.style.border = '1.5px solid #ff5e62';
    randomBtn.style.borderRadius = '4px';
    randomBtn.style.cursor = 'pointer';
    randomBtn.style.fontSize = '1rem';
    randomBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    randomBtn.style.transition = 'background 0.2s, color 0.2s';
    randomBtn.onclick = () => {
        isFavOpen = false;
        const idx = Math.floor(Math.random() * allVerses.length);
        renderVerses([allVerses[idx]], true, null);
    };
    if (searchContainer) searchContainer.appendChild(randomBtn);

    // --- Chapter Navigation ---
    const chapterNav = document.createElement('select');
    chapterNav.id = 'chapter-nav';
    chapterNav.style.marginLeft = '1rem';
    chapterNav.style.padding = '0.4rem 0.8rem';
    chapterNav.style.fontSize = '1rem';
    for (let i = 1; i <= 18; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Chapter ${i}`;
        chapterNav.appendChild(opt);
    }
    
    chapterNav.addEventListener('change', function() {
        const chapterNum = parseInt(chapterNav.value);
        localStorage.setItem('currentChapter', chapterNum);
        isFavOpen = false; // Close favorites view when changing chapter
        filterChapter(chapterNum, allVerses, renderVerses);
    });

    if (searchContainer) searchContainer.appendChild(chapterNav);
    
    function filterChapter(chapterNum, allVerses, renderFn) {
       const filtered = allVerses.filter(v => {
            const num = v.text.match(/\d+\.\d+/) || v.text.match(/\d+/);
            return num && String(num[0]).split('.')[0] == chapterNum;
        });
        renderFn(filtered, false, chapterNum);
    }


    // --- Night Mode Toggle ---
    const nightBtn = document.createElement('button');
    nightBtn.textContent = 'dark_mode';
    nightBtn.className = 'mode-toggle-btn material-symbols-rounded';
    nightBtn.title = "Toggle Night Mode (Ctrl+D)";
    nightBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    nightBtn.style.transition = 'background 0.2s, color 0.2s';
    
    function applyNightMode(isNight) {
        document.body.classList.toggle('night-mode', isNight);
        nightBtn.textContent = isNight ? 'light_mode' : 'dark_mode';
    }

    nightBtn.onclick = () => {
        nightMode = !nightMode;
        localStorage.setItem('nightMode', nightMode); // Save preference
        applyNightMode(nightMode);
    };

    document.body.appendChild(nightBtn);
    applyNightMode(nightMode); // Apply on initial load


    // --- Renders all verses, attaches event listeners ---
    function renderVerses(verses, isFilteredView = false, chapterNum = parseInt(chapterParam)) {
        if (!versesContainer) return;
        versesContainer.innerHTML = '';
        updateClearFiltersButton(isFilteredView);
        // Remove any existing .fav-list-btn to prevent multiplying
        const oldFavBtn = document.querySelector('.fav-list-btn');
        if (oldFavBtn) oldFavBtn.remove();
        // Remove translation language selector if present
        const oldTransSel = document.getElementById('translation-lang-select');
        if (oldTransSel) oldTransSel.remove();

        if (verses.length === 0 && isFilteredView) {
             versesContainer.innerHTML = `<div class="info-message">No verses found matching your search.</div>`;
        }

        // Translation tool: language selector
        const langSel = document.createElement('select');
        langSel.id = 'translation-lang-select';
        langSel.style.marginLeft = '1rem';
        langSel.style.padding = '0.4rem 0.8rem';
        langSel.style.fontSize = '1rem';
        langSel.innerHTML = '<option value="english">English</option><option value="hindi">Hindi</option>';
        if (searchContainer) searchContainer.appendChild(langSel);
        let translationLang = localStorage.getItem('translationLang') || 'english';
        langSel.value = translationLang;
        langSel.addEventListener('change', function() {
            localStorage.setItem('translationLang', langSel.value);
            // Re-render the current view with the new language
             if (isFavOpen) {
                showFavorites(allVerses, renderVerses);
            } else if (searchInput.value) {
                searchInput.dispatchEvent(new Event('input'));
            } 
            else {
                const chapterNav = document.getElementById('chapter-nav');
                filterChapter(parseInt(chapterNav.value), allVerses, renderVerses);
            }
        });

        if (chapterNum) {
            const ChapterDiv = document.createElement('div');
            ChapterDiv.classList = 'chapter';
            const chapterMean = window.allChapters.find(c => c.chapter_number === chapterNum);
            ChapterDiv.innerHTML = `<h1>${chapterNum}: ${chapterMean ? (translationLang === 'english' ? chapterMean.name_translation : chapterMean.name) : 'Unknown Chapter'}</h1>
            ${translationLang === 'english' ? `<h2>${chapterMean ? chapterMean.name_meaning : 'Unknown Title'}</h2>` : ''}
            <p>${chapterMean ? (translationLang === 'english' ? chapterMean.chapter_summary : chapterMean.chapter_summary_hindi) : 'No summary available'}</p>`;
            versesContainer.appendChild(ChapterDiv);
        }

        verses.forEach((v, i) => {
            const div = document.createElement('div');
            div.className = 'verse';
            div.style.position = 'relative';
            setTimeout(() => {
                div.classList.add('visible');
                div.classList.add('reveal');
                setTimeout(()=>div.classList.remove('reveal'), 800);
            }, 80 * i);
            // Extract verse number
            let num = v.text.match(/\d+\.\d+/) || v.text.match(/\d+/);
            num = num ? num[0] : (i+1);
            // Favorite tool
            const favs = JSON.parse(localStorage.getItem('favVerses')||'[]');
            const isFav = favs.includes(num);
            div.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
                  <h3 style="margin:0;">Verse ${num}</h3>
                  <span style="display:flex;gap:0.3rem;align-items:center;">
                    <button class="fav-btn" title="Favorite" data-num="${num}" style="font-size:1.5rem;color:${isFav?'#ff5e62':'#bbb'};"><span class="material-symbols-rounded">${isFav ? 'star' : 'star_outline'}</span></button>
                    <button class="share-btn" title="Share Verse" data-num="${num}" style="font-size:1.2rem;"><span class="material-symbols-rounded">share</span></button>
                    <button class="download-img-btn" title="Download as Image" data-num="${num}" style="font-size:1.2rem;"><span class="material-symbols-rounded">image</span></button>
                  </span>
                </div>
                <pre style="font-size:1.1rem;line-height:1.5;white-space:pre-wrap;">${v.text.replace(/\n/g, '<br>')}</pre>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                  <button class="play-audio-btn" data-chap="${String(num).split('.')[0]}" data-verse="${String(num).split('.')[1]||num}"><span class="material-symbols-rounded">volume_up</span></button>
                  <div class="audio-progress" style="flex:1;height:6px;border-radius:3px;overflow:hidden;position:relative;display:none;margin:0 0.5rem;"><div class="audio-bar" style="height:100%;background:#ff5e62;width:0;"></div></div>
                  <button class="copy-btn" data-text="${encodeURIComponent(v.text)}" title="Copy Verse" style="font-size:1rem;"><span class="material-symbols-rounded">content_copy</span></button>
                </div>
                ${hrUrl}
                <div class="mean-container"></div>
                <div class="translation-container"></div>
            `;
            // Add translation from translation.json
            const translationContainer = div.querySelector('.translation-container');
            if (window.allTranslations && translationContainer) {
                const verseNumOnly = parseInt(num.split('.')[1] || num);
                const chapNum = parseInt(num.split('.')[0] || '1');
                let translation = window.allTranslations.find(t => t.shloka_no === getId(verseNumOnly, chapNum));
                if (translation) {
                    let isEng = translationLang === 'english';
                    translationContainer.innerHTML = `<details><summary>Show ${isEng ? 'English' : 'Hindi'} Translation</summary>` +
                    `<div style="margin:0.5rem 0;"><span>${isEng ? translation.two : translation.one}</span></div>` + '</details>';
                }
            }
            // Add mean if available (legacy)
            const mean = translationLang === 'english' ? v.mean : window.hinMeans[getId(num, 0, true) - 1].description;
            if (mean) {
                div.querySelector('.mean-container').innerHTML = `<details class="mean-details"><summary>Show Meaning</summary><div style="margin-top:0.5rem;font-size:1rem;">${mean.replace(/\n/g, '<br>')}</div></details>`;
            }

            // --- Download as Image ---
            div.querySelector('.download-img-btn').onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = 300;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = nightMode ? '#222' : '#fff';
                ctx.fillRect(0,0,600,300);
                ctx.font = 'bold 22px Montserrat';
                ctx.fillStyle = '#F47B2D';
                ctx.fillText(`Verse ${num}`, 30, 50);
                ctx.font = '18px Roboto';
                ctx.fillStyle = nightMode ? '#fff' : '#222';
                let lines = v.text.split('\n');
                lines.forEach((line, idx) => ctx.fillText(line, 30, 90+idx*28));
                ctx.font = 'italic 16px Roboto';
                ctx.fillStyle = '#888';
                ctx.fillText('Bhagavad Gita Explorer', 30, 280);
                const link = document.createElement('a');
                link.download = `verse_${num}.png`;
                link.href = canvas.toDataURL();
                link.click();
            };
            versesContainer.appendChild(div);
        });
        // --- Favorites Button ---
        let favBtn = document.querySelector('.fav-list-btn');
        if (!favBtn) {
            favBtn = document.createElement('button');
            favBtn.className = 'fav-list-btn';
             favBtn.style.marginLeft = '1rem';
            favBtn.style.padding = '0.8rem 1.2rem';
            favBtn.style.border = '1.5px solid #F47B2D';
            favBtn.style.borderRadius = '4px';
            favBtn.style.cursor = 'pointer';
            favBtn.style.fontSize = '1rem';
            favBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            favBtn.style.transition = 'background 0.2s, color 0.2s';
        }
        favBtn.textContent = isFavOpen ? '✕ Close' : '★ Favorites';
        favBtn.onmouseenter = () => { favBtn.style.background = '#F47B2D'; favBtn.style.color = '#fff'; };
        favBtn.onmouseleave = () => { favBtn.style.background = 'transparent'; favBtn.style.color = '#F47B2D'; };

        favBtn.onclick = () => {
            isFavOpen = !isFavOpen;
            if(isFavOpen) {
                searchInput.value = '';
                showFavorites(allVerses, renderVerses);
            } else {
                closeFavorites(allVerses, renderVerses);
            }
             favBtn.textContent = isFavOpen ? '✕ Close' : '★ Favorites';
        };
        if (searchContainer) searchContainer.appendChild(favBtn);
    }
    
     // --- Event Delegation for Verse Actions ---
    document.addEventListener('click', (e) => {
        // Favorite
        if (e.target.closest('.fav-btn')) {
            const btn = e.target.closest('.fav-btn');
            const verseNum = btn.dataset.num;
            toggleFavorite(verseNum, btn);
        }
        // Share
        if (e.target.closest('.share-btn')) {
            const btn = e.target.closest('.share-btn');
            const verseDiv = btn.closest('.verse');
            const text = verseDiv ? verseDiv.querySelector('pre').innerText : '';
            shareVerse(text);
        }
        // Copy
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
            const text = decodeURIComponent(btn.dataset.text);
            copyVerse(text, btn);
        }
        // Play Audio
        if (e.target.closest('.play-audio-btn')) {
            const btn = e.target.closest('.play-audio-btn');
            const chap = btn.dataset.chap;
            const verse = btn.dataset.verse;
            if(isVersePlaying&&window.audioPlaying) window.audioPlaying.pause(); // Pause any currently playing audio
            isVersePlaying = true;
            // Audio player with progress bar
            const audioPath = `https://gita.github.io/gita/data/verse_recitation/${chap}/${verse}.mp3`;
            const audio = new Audio(audioPath);
            window.audioPlaying = audio; // Expose for external use
            const verseDiv = btn.closest('.verse');
            const progress = verseDiv.querySelector('.audio-progress');
            const bar = verseDiv.querySelector('.audio-bar');
            progress.style.display = 'block';
            audio.addEventListener('timeupdate', () => {
                bar.style.width = ((audio.currentTime/audio.duration)*100 || 0) + '%';
            });
            audio.addEventListener('ended', () => {
                progress.style.display = 'none';
                bar.style.width = '0';
                isVersePlaying = false;
                window.audioPlaying = null; // Clear reference
            });
            audio.play();
         }
    });

    // --- Enhanced Keyword & Number Search ---
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const val = searchInput.value.trim().toLowerCase();
             isFavOpen = false; // Exit favorite mode when searching
            
            if (!val) {
                const currentChapter = localStorage.getItem('currentChapter') || '1';
                filterChapter(parseInt(currentChapter), allVerses, renderVerses);
                return;
            }
            
            // Search verse text, number, and translations
            const translationLang = localStorage.getItem('translationLang') || 'english';
            const filtered = allVerses.filter(v => {
                const num = v.text.match(/\d+\.\d+/) || v.text.match(/\d+/);
                const verseNumOnly = parseInt(num[0].split('.')[1] || num[0]);
                const chapNum = parseInt(num[0].split('.')[0] || '1');
                
                const translation = window.allTranslations.find(t => t.verseNumber === getId(verseNumOnly, chapNum) && t.lang === translationLang);

                return (num && num[0].startsWith(val)) // By number
                    || v.text.toLowerCase().includes(val) // By verse text
                    || (translation && translation.description.toLowerCase().includes(val)); // By translation
            });
            renderVerses(filtered, true, null);
        });
    }

     // --- Clear Filter Button ---
    let clearBtn = null;
    function updateClearFiltersButton(show) {
        if (!searchContainer) return;
        if (show && !clearBtn) {
            randomBtn.style.display = 'none'; // Hide random button when filtering
            clearBtn = document.createElement('button');
            clearBtn.textContent = '✕';
            clearBtn.className = 'clear-filter-btn';
            clearBtn.onclick = () => {
                isFavOpen = false;
                searchInput.value = '';
                const lastChapter = localStorage.getItem('currentChapter') || '1';
                chapterNav.value = lastChapter;
                filterChapter(parseInt(lastChapter), allVerses, renderVerses);
            };
            searchContainer.insertBefore(clearBtn, searchContainer.children[1]);
        } else if (!show && clearBtn) {
            clearBtn.remove();
            randomBtn.style.display = 'inline-block'; // Restore random button width
            clearBtn = null;
        }
    }

});


function getId(verse_no, chap_no, isNumbered = false) {
    if (isNumbered) {
        chap_no = parseInt(verse_no.split('.')[0]);
        verse_no = parseInt(verse_no.split('.')[1]);
    }
    let NoOfVerses = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
    let total_verses = 0;
    // Ensure chap_no is a valid index
    if (chap_no < 1 || chap_no > NoOfVerses.length) return 0;
    for (let i = 0; i < chap_no - 1; i++) {
        total_verses += NoOfVerses[i];
    }
    return total_verses + verse_no;
}

window.getId = getId; // Expose for external use