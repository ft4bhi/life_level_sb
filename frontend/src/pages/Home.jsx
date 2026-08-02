import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { ZONES } from './waypointData';
import { ACCESS_TOKEN } from '../constans';
import '../styles/Home.css';

// GSAP Custom Hook integrated directly for standard React usage
function useWaypointGsap(nodes, fetchJournals, setEditingId, setTitle, setContent, setExcerpt, setMood, setShowFormModal) {
  const initialized = useRef(false);

  useEffect(() => {
    // If no nodes, or already running, Skip to prevent duplicate binding
    if (!nodes || !nodes.length) return;
    
    // Reset initialized ref to allow reflowing map when notes filter or update
    let cleanupFns = [];

    (async () => {
      const gsapModule = await import("gsap");
      const ScrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger = ScrollTriggerModule.ScrollTrigger ?? ScrollTriggerModule.default;

      gsap.registerPlugin(ScrollTrigger);

      (function () {
        "use strict";
        var reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        /* ============= LAYOUT CONSTANTS ============= */
        function spacing() {
          return window.innerWidth < 640 ? 320 : window.innerWidth < 1000 ? 380 : 460;
        }
        var TOP_PAD = 110,
          BOTTOM_PAD = 160;
        var nodesContainer = document.getElementById("nodesContainer");
        var levelMap = document.getElementById("levelMap");
        var trailBg = document.getElementById("trailBg");
        var trailFg = document.getElementById("trailFg");
        var wayfinder = document.getElementById("wayfinder");
        var originMarker = document.getElementById("originMarker");
        
        if (!nodesContainer || !levelMap || !trailBg || !trailFg || !wayfinder || !originMarker) return;

        var points = [];

        function buildLayout() {
          var SPACING = spacing();
          var totalHeight = TOP_PAD + (nodes.length - 1) * SPACING + BOTTOM_PAD;
          levelMap.style.minHeight = totalHeight + "px";
          points = nodes.map(function (n, i) {
            return { x: n.x, y: TOP_PAD + i * SPACING };
          });
          nodesContainer.innerHTML = nodes.map(function (n, i) {
            var p = points[i];
            var alignClass = n.x < 40 ? "align-r" : n.x > 60 ? "align-l" : "";
            if (n.today) {
              return (
                '<div class="level-node" data-idx="' + i + '" style="left:' + p.x + "%; top:" + p.y + 'px;">' +
                '<button class="node-hit" data-open="today">' +
                '<div class="node-badge today"><span>+</span></div>' +
                '<div class="today-tag">Write today\'s entry</div>' +
                "</button></div>"
              );
            }
            return (
              '<div class="level-node ' + alignClass + '" data-idx="' + i + '" style="left:' + p.x + "%; top:" + p.y + 'px;">' +
              '<button class="node-hit" data-open="' + i + '">' +
              '<div class="node-badge zone-' + n.zone + '"><span>' + n.mood + '</span><span class="lvl-num">LV ' + (nodes.length - i) + "</span></div>" +
              '<div class="node-title">' + n.title + "</div>" +
              '<div class="node-date">' + n.date + "</div>" +
              '<div class="node-excerpt">' + n.excerpt + "</div>" +
              "</button></div>"
            );
          }).join("");
          originMarker.style.top = points[points.length - 1].y + 90 + "px";
          var d = catmullRomPath(points);
          trailBg.setAttribute("d", d);
          trailFg.setAttribute("d", d);
          var svg = document.getElementById("trailSvg");
          if (svg) {
            svg.setAttribute("viewBox", "0 0 100 " + totalHeight);
            svg.setAttribute("preserveAspectRatio", "none");
            svg.style.height = totalHeight + "px";
          }
          return totalHeight;
        }

        function catmullRomPath(pts) {
          var full = [{ x: pts[0].x, y: Math.max(0, pts[0].y - 70) }]
            .concat(pts)
            .concat([{ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y + 70 }]);
          var d = "M " + full[0].x + " " + full[0].y + " ";
          for (var i = 0; i < full.length - 1; i++) {
            var p0 = full[i - 1] || full[i];
            var p1 = full[i];
            var p2 = full[i + 1];
            var p3 = full[i + 2] || p2;
            var c1x = p1.x + (p2.x - p0.x) / 6;
            var c1y = p1.y + (p2.y - p0.y) / 6;
            var c2x = p2.x - (p3.x - p1.x) / 6;
            var c2y = p2.y - (p3.y - p1.y) / 6;
            d += "C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y + " ";
          }
          return d;
        }

        var totalHeight = buildLayout();

        /* ============= SCROLL-LINKED ANIMATION ============= */
        var layers = {
          meadow: document.getElementById("layer-meadow"),
          woods: document.getElementById("layer-woods"),
          dunes: document.getElementById("layer-dunes"),
          frost: document.getElementById("layer-frost"),
          hollow: document.getElementById("layer-hollow"),
        };
        var zonePill = document.getElementById("zonePill");
        var zoneText = document.getElementById("zoneText");
        var pathLen = trailFg.getTotalLength();
        trailFg.style.strokeDasharray = pathLen;
        trailFg.style.strokeDashoffset = pathLen;

        function clamp01(v) {
          return Math.max(0, Math.min(1, v));
        }

        function onScrollProgress(progress) {
          trailFg.style.strokeDashoffset = pathLen * (1 - progress);
          var pt = trailFg.getPointAtLength(pathLen * progress);
          wayfinder.style.left = pt.x + "%";
          wayfinder.style.top = pt.y + "px";
          var bestZone = null,
            bestOpacity = -1;
          ZONES.forEach(function (z) {
            var dist = Math.abs(progress - z.center);
            var op = clamp01(1 - dist / 0.26);
            if (layers[z.key]) {
              layers[z.key].style.opacity = String(op);
            }
            if (op > bestOpacity) {
              bestOpacity = op;
              bestZone = z;
            }
          });
          if (bestZone && zoneText) {
            zoneText.textContent = bestZone.icon + "  " + bestZone.label;
          }
          if (zonePill) {
            zonePill.classList.toggle("show", progress > 0.02 && progress < 0.985);
          }
        }

        var mainTrigger = ScrollTrigger.create({
          trigger: levelMap,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          onUpdate: function (self) {
            onScrollProgress(self.progress);
          },
        });
        onScrollProgress(0);

        var nodeTriggers = [];
        document.querySelectorAll(".level-node").forEach(function (el) {
          nodeTriggers.push(
            ScrollTrigger.create({
              trigger: el,
              start: "top 88%",
              onEnter: function () {
                el.classList.add("is-visible");
              },
              onLeaveBack: function () {
                el.classList.remove("is-visible");
              },
            })
          );
        });
        var originTrigger = ScrollTrigger.create({
          trigger: originMarker,
          start: "top 90%",
          onEnter: function () {
            originMarker.classList.add("is-visible");
          },
          onLeaveBack: function () {
            originMarker.classList.remove("is-visible");
          },
        });

        /* ============= PARTICLES ============= */
        var particleColors = {
          meadow: "111,169,138",
          woods: "143,201,164",
          dunes: "227,168,87",
          frost: "143,182,201",
          hollow: "155,135,196",
        };
        if (!reduceMotion) {
          Object.keys(layers).forEach(function (key) {
            var layer = layers[key];
            if (!layer) return;
            // Clear any old particles
            layer.querySelectorAll('.particle').forEach(p => p.remove());

            var count = 16;
            for (var i = 0; i < count; i++) {
              var p = document.createElement("div");
              p.className = "particle";
              var size = 2 + Math.random() * 3;
              p.style.width = size + "px";
              p.style.height = size + "px";
              p.style.left = Math.random() * 100 + "%";
              p.style.top = 20 + Math.random() * 70 + "%";
              p.style.background = "rgb(" + particleColors[key] + ")";
              p.style.boxShadow = "0 0 6px rgba(" + particleColors[key] + ",.8)";
              p.style.setProperty("--dx", Math.random() * 40 - 20 + "px");
              p.style.animationDelay = Math.random() * 9 + "s";
              p.style.animationDuration = 7 + Math.random() * 5 + "s";
              layer.appendChild(p);
            }
          });
        }

        /* ============= PAGE LOAD INTRO ============= */
        if (!reduceMotion) {
          var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.from("#topnav", { y: -100, opacity: 0, duration: 0.7 })
            .to("#eyebrow", { opacity: 1, duration: 0.8 }, "-=.35");
        } else {
          gsap.set(["#eyebrow"], { opacity: 1, y: 0 });
        }

        /* ============= MODAL (read-only for past nodes) ============= */
        var overlay = document.getElementById("modalOverlay");
        var modalCard = document.getElementById("modalCard");

        function openReadModal(idx) {
          var n = nodes[idx];
          if (!modalCard || !overlay) return;
          modalCard.innerHTML =
            '<div class="modal-top">' +
            "<div><h3>" + n.title + '</h3><div class="modal-meta">' + n.date + "  ·  " + n.mood + "</div></div>" +
            '<div>' +
            '<button class="modal-edit" id="editBtn"><i class="fa-solid fa-pencil"></i></button>' +
            '<button class="modal-delete" id="deleteBtn"><i class="fa-solid fa-trash"></i></button>' +
            '<button class="modal-close" id="closeModal"><i class="fa-solid fa-xmark"></i></button>' +
            "</div>" +
            "</div>" +
            '<p class="modal-body-text">' + n.body + "</p>";
          overlay.classList.add("open");
          
          document.getElementById("closeModal").addEventListener("click", closeOverlay);
          document.getElementById("editBtn").addEventListener("click", () => {
            setEditingId(n.id);
            setTitle(n.title);
            setContent(n.body);
            setExcerpt(n.excerpt);
            setMood(n.mood);
            closeOverlay();
            setShowFormModal(true);
          });
          document.getElementById("deleteBtn").addEventListener("click", () => handleDelete(n.id));
          document.body.style.overflow = "hidden";
        }

        async function handleDelete(journalId) {
          const token = localStorage.getItem(ACCESS_TOKEN);
          if (!token) return;

          if (confirm("Are you sure you want to delete this journal entry?")) {
            try {
              const res = await fetch(`http://localhost:8000/api/notes/delete/${journalId}/`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!res.ok) {
                throw new Error("Failed to delete journal");
              }
              
              closeOverlay();
              fetchJournals();
            } catch (error) {
              console.error(error);
              alert("Failed to delete journal entry.");
            }
          }
        }

        function closeOverlay() {
          if (overlay) overlay.classList.remove("open");
          document.body.style.overflow = "";
        }
        function onOverlayClick(e) {
          if (e.target === overlay) closeOverlay();
        }
        function onDocKeydown(e) {
          if (e.key === "Escape") closeOverlay();
        }
        overlay.addEventListener("click", onOverlayClick);
        document.addEventListener("keydown", onDocKeydown);

        function onNodesContainerClick(e) {
          var btn = e.target.closest("[data-open]");
          if (!btn) return;
          var val = btn.getAttribute("data-open");
          if (val === "today") {
            // Trigger local React Create Form open
            setEditingId(null);
            setTitle('');
            setContent('');
            setExcerpt('');
            setMood('⚔️ Adventurous');
            setShowFormModal(true);
          } else {
            openReadModal(parseInt(val, 10));
          }
        }
        nodesContainer.addEventListener("click", onNodesContainerClick);

        /* ============= RESIZE ============= */
        var resizeTimer;
        function onResize() {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            buildLayout();
            pathLen = trailFg.getTotalLength();
            trailFg.style.strokeDasharray = pathLen;
            ScrollTrigger.refresh();
          }, 200);
        }
        window.addEventListener("resize", onResize);

        cleanupFns.push(function () {
          if (overlay) overlay.removeEventListener("click", onOverlayClick);
          document.removeEventListener("keydown", onDocKeydown);
          if (nodesContainer) nodesContainer.removeEventListener("click", onNodesContainerClick);
          window.removeEventListener("resize", onResize);
          mainTrigger.kill();
          originTrigger.kill();
          nodeTriggers.forEach(function (t) {
            t.kill();
          });
        });
      })();
    })();

    return () => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
    };
  }, [nodes]);
}

function Home() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Local state controls for Settings / Profile Dropdowns
  const [showSettings, setShowSettings] = useState(false);
  const [fastAnim, setFastAnim] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Form overlay modal state
  const [showFormModal, setShowFormModal] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [mood, setMood] = useState('⚔️ Adventurous');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/notes/');
      // Sort notes so index 0 is oldest or latest based on GSAP progression.
      // Waypoint scrolling: progress goes from top (today/latest index 0) to bottom (oldest).
      // So sorting from latest to oldest:
      const sorted = res.data.sort((a, b) => b.id - a.id);
      
      const formatted = sorted.map((journal, index) => ({
        id: journal.id,
        title: journal.title,
        excerpt: journal.excerpt || '',
        body: journal.content || '',
        mood: journal.mood || '😐 Neutral',
        date: new Date(journal.created_at).toLocaleDateString("en-US", {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        x: index % 2 === 0 ? 28 : 70, // Alternate x position
        zone: ["meadow", "woods", "dunes", "frost", "hollow"][index % 5], // Cycle through zones
      }));

      setJournals(formatted.slice(0, 10));
    } catch (err) {
      setError('Could not retrieve adventure logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required.');
      return;
    }

    setLoading(true);
    setError(null);
    const payload = {
      title,
      content,
      excerpt: excerpt.trim() || content.substring(0, 80) + '...',
      mood,
    };

    try {
      if (editingId) {
        await api.put(`/api/notes/${editingId}/`, payload);
      } else {
        await api.post('/api/notes/', payload);
      }

      // Clear details
      setTitle('');
      setContent('');
      setExcerpt('');
      setMood('⚔️ Adventurous');
      setEditingId(null);
      setShowFormModal(false);

      // Reload nodes list
      fetchJournals();
    } catch (err) {
      setError('Could not save note. Check input parameters.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Compile nodes list representing map waypoints
  const filteredJournals = journals.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // The today node sits at the top (index 0), then followed by journals list.
  const mapNodes = [
    { today: true, x: 50, zone: 'meadow' },
    ...filteredJournals
  ];

  // Invoke scroll waypoint script hook with computed nodes list
  useWaypointGsap(
    mapNodes, 
    fetchJournals, 
    setEditingId, 
    setTitle, 
    setContent, 
    setExcerpt, 
    setMood, 
    setShowFormModal
  );

  // Calculate day streak based on unique journal dates
  const uniqueDates = [...new Set(journals.map(j => j.date))];
  const completedDays = uniqueDates.length;

  return (
    <div className="rpg-app-root">
      {/* Background Layers */}
      <div className="bg-layers">
        <div className="bg-layer" id="layer-meadow"></div>
        <div className="bg-layer" id="layer-woods"></div>
        <div className="bg-layer" id="layer-dunes"></div>
        <div className="bg-layer" id="layer-frost"></div>
        <div className="bg-layer" id="layer-hollow"></div>
      </div>

      {/* Top Header Navigation */}
      <header className="topnav" id="topnav">
        <div className="brand">
          <div className="mark">⚔️</div>
          <div>
            <h1 className="display">LIFE LEVELS</h1>
            <span>PLAYER ADVENTURE LOG</span>
          </div>
        </div>

        {/* Search Pill */}
        <div className="search-wrap">
          <div className="search-pill">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder="Search adventures or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="hint">/</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="nav-right">
          {/* Settings */}
          <div className="settings-wrap">
            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
              <i className="fa-solid fa-sliders"></i>
            </button>
            <div className={`settings-panel ${showSettings ? 'open' : ''}`}>
              <h4>Map Settings</h4>
              <div className="toggle-row">
                <span>Fast Scrolling</span>
                <button className={`switch ${fastAnim ? 'on' : ''}`} onClick={() => setFastAnim(!fastAnim)}></button>
              </div>
              <div className="toggle-row">
                <span>Rune Sound FX</span>
                <button className={`switch ${soundOn ? 'on' : ''}`} onClick={() => setSoundOn(!soundOn)}></button>
              </div>
            </div>
          </div>

          {/* User Profile avatar dropdown */}
          <div className="profile-wrap">
            <button className="avatar-btn">
              <div className="avatar-glyph">HR</div>
            </button>
            <div className="profile-card">
              <div className="profile-head">
                <div className="avatar-lg">HR</div>
                <div>
                  <h3>Hero</h3>
                  <p>LEVEL {journals.length}</p>
                </div>
              </div>
              <div className="xp-row">
                <div className="xp-labels">
                  <span>LEVEL PROGRESS</span>
                  <span>{journals.length * 10}%</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-fill" style={{ width: `${(journals.length * 10) % 100}%` }}></div>
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="v">{journals.length}</div>
                  <div className="l">Quests Completed</div>
                </div>
                <div className="stat-box">
                  <div className="v">{completedDays}</div>
                  <div className="l">Journals Logged</div>
                </div>
              </div>
              <button className="auth-btn" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket"></i> Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Eyebrow Banner Section */}
      <section className="eyebrow-wrap" id="eyebrow">
        <div className="eyebrow">Interactive Quest Log</div>
        <h2 className="display">Wayfarer's Trail</h2>
        <p>Scroll down to trace your leveling path. Walk through previous nodes or document today's progress using the interactive checkpoints.</p>
      </section>

      {/* Floating Zone progress indicator */}
      <div className="zone-pill" id="zonePill">
        <span id="zoneText">🌄  Meadow</span>
      </div>

      {/* Level Waypoint Map Grid */}
      <div id="levelMap" className="level-map">
        {/* Dynamic SVG trail path */}
        <svg id="trailSvg" className="trail-svg" xmlns="http://www.w3.org/2000/svg">
          <path id="trailBg" fill="none" stroke="rgba(237, 230, 214, 0.06)" strokeWidth="6" strokeLinecap="round" />
          <path id="trailFg" fill="none" stroke="var(--ember)" strokeWidth="6" strokeLinecap="round" />
        </svg>

        {/* wayfinder floating avatar */}
        <div id="wayfinder" className="wayfinder-character">
          <div className="character-avatar">🧘</div>
          <div className="wayfinder-pulse"></div>
        </div>

        {/* Origin Marker */}
        <div id="originMarker" className="origin-marker">
          <div className="origin-star">✦</div>
          <div className="origin-label">ORIGIN</div>
        </div>

        {/* Container populated dynamically by useWaypointGsap */}
        <div id="nodesContainer" className="nodes-container"></div>
      </div>

      {/* Modal overlays rendered by useWaypointGsap */}
      <div id="modalOverlay" className="modal-overlay">
        <div id="modalCard" className="modal-card"></div>
      </div>

      {/* React Modal form overlay for publishing / editing entry details */}
      {showFormModal && (
        <div className="form-modal-overlay fade-in" onClick={() => setShowFormModal(false)}>
          <div className="rpg-panel form-panel form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="form-modal-header">
              <h2>{editingId ? `📝 Edit Adventure Log #${editingId}` : '✍️ Record Today\'s Quest'}</h2>
              <button className="close-btn" onClick={() => setShowFormModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="rpg-form">
              <div className="form-group">
                <label>Quest Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Conquered the High Slopes..." 
                  required 
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Hero Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)}>
                    <option value="⚔️ Adventurous">⚔️ Adventurous</option>
                    <option value="🧘 Peaceful">🧘 Peaceful</option>
                    <option value="🔥 Energized">🔥 Energized</option>
                    <option value="🛡️ Defensive">🛡️ Defensive</option>
                    <option value="💀 Exhausted">💀 Exhausted</option>
                    <option value="🧠 Thoughtful">🧠 Thoughtful</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Short Summary</label>
                  <input 
                    type="text" 
                    value={excerpt} 
                    onChange={(e) => setExcerpt(e.target.value)} 
                    placeholder="Brief highlight details..." 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Quest Chronicle</label>
                <textarea 
                  rows="6" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Describe your trials, accomplishments, and stats details..." 
                  required 
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="rpg-btn btn-primary" disabled={loading}>
                  {loading ? 'Recording...' : editingId ? 'Update Log' : 'Publish Log'}
                </button>
                <button type="button" className="rpg-btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  Dismiss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;