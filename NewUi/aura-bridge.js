(function () {
  if (window.__auraBridgeInstalled) return;
  window.__auraBridgeInstalled = true;

  var AURA_ACCENT = "#e85d4c";
  var AURA_NAME = "Aura";
  var lastTabs = [];
  var lastActiveTab = "1";
  var lastHeader = "Main Menu";
  var lastUsername = "Aura";
  var loaderShown = false;
  var keyPickOpen = false;
  var textOpen = false;

  function logoUrl() {
    return window.__AURA_ARGS_LOGO || "https://auramenu.xyz/img/logo.png";
  }

  function toHexColor(c) {
    if (c == null || c === "") return AURA_ACCENT;
    var s = String(c).trim();
    if (s.charAt(0) === "#") {
      if (s.length === 4) {
        return (
          "#" +
          s.charAt(1) +
          s.charAt(1) +
          s.charAt(2) +
          s.charAt(2) +
          s.charAt(3) +
          s.charAt(3)
        );
      }
      return s;
    }
    var m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return s;
    function hx(n) {
      n = Math.max(0, Math.min(255, parseInt(n, 10) || 0));
      return ("0" + n.toString(16)).slice(-2);
    }
    return "#" + hx(m[1]) + hx(m[2]) + hx(m[3]);
  }

  function emit(obj) {
    if (!obj || !obj.action) return;
    obj.__auraNative = true;
    window.postMessage(obj, "*");
  }

  function scrollSelected(vals, value) {
    if (!vals || !vals.length) return 0;
    if (typeof value === "number") {
      if (value >= 1 && value <= vals.length) return value - 1;
      if (value >= 0 && value < vals.length) return value;
      return 0;
    }
    var idx = vals.indexOf(value);
    if (idx >= 0) return idx;
    idx = vals.findIndex(function (v) {
      return String(v) === String(value);
    });
    return idx >= 0 ? idx : 0;
  }

  function mapItem(el) {
    if (!el || typeof el !== "object") return el;
    var t = String(el.type || "button");
    var out = {};
    for (var k in el) {
      if (Object.prototype.hasOwnProperty.call(el, k)) out[k] = el[k];
    }
    if (t === "divider") out.type = "separator";
    else if (t === "subMenu") out.type = "submenu";
    else if (t === "scrollable") {
      out.type = "scroll";
      out.options = el.values || el.options || [];
      out.selected = scrollSelected(out.options, el.value);
    } else if (t === "scrollable-checkbox") {
      out.type = "checkbox";
      out.scrollOptions = el.values || el.options || [];
      out.scrollSelected = scrollSelected(out.scrollOptions, el.value);
    } else if (t === "slider-checkbox") {
      out.type = "checkbox";
      out.sliderOptions = {
        min: el.min,
        max: el.max,
        value: el.value,
        step: el.step,
      };
    } else if (t === "slider") {
      out.type = "slider";
      if (el.sliderOptions == null) {
        out.min = el.min;
        out.max = el.max;
        out.value = el.value;
      }
    }
    if (el.serverId != null) {
      out.playerId = el.serverId;
      out.inVehicle = el.vehicle === true;
      out.inRadio = el.radio === true || el.status === "radio";
    }
    return out;
  }

  function mapMenu(els) {
    if (!Array.isArray(els)) return [];
    return els.map(mapItem);
  }

  function mapTabs(cats) {
    if (!Array.isArray(cats) || !cats.length) return [];
    return cats.map(function (c, i) {
      return {
        id: String(i + 1),
        title: (c && (c.label || c.title || c.name)) || "Tab " + (i + 1),
      };
    });
  }

  function sectionTitle(d) {
    return (
      d.headerLabel ||
      d.currentMenuLabel ||
      window.__auraSectionTitle ||
      lastHeader ||
      "Main Menu"
    );
  }

  function emitSetCurrent(d, isShow) {
    var tabs = mapTabs(d.categories);
    if (tabs.length) {
      lastTabs = tabs;
      lastActiveTab = String((d.categoryIndex || 0) + 1);
    } else if (d.clearCategories) {
      lastTabs = [];
    }
    lastHeader = sectionTitle(d);
    if (d.username) lastUsername = String(d.username);
    var isMain = d.isMainMenu === true;
    var showTabs = lastTabs.length > 1;
    emit({
      action: "setCurrent",
      menu: mapMenu(d.elements),
      current: (d.index != null ? Number(d.index) : 0) + 1,
      visible: d.visible,
      showTabs: showTabs,
      hideTabs: !showTabs,
      tabs: lastTabs,
      activeTabId: lastActiveTab,
      headerLabel: lastHeader,
      isInTabbedMenu: !isMain && lastTabs.length > 0,
      currentMenuLabel: lastHeader,
      resetScroll: isShow === true,
      skipMenuAnim: isShow !== true,
      skipScroll: isShow !== true,
      username: lastUsername,
    });
    emit({ action: "updateFooterUser", username: lastUsername });
  }

  function mapFreecam(d) {
    var vis = d.visible === true;
    var feats = d.features || d.options || [];
    var sel =
      d.featureIndex != null
        ? Number(d.featureIndex)
        : (Number(d.index) || 0) + 1;
    if (!vis) {
      emit({ action: "freecamHide" });
      emit({ action: "toggleFreecamUI", visible: false });
      return;
    }
    emit({
      action: "toggleFreecamUI",
      visible: true,
      options: feats,
      selectedOption: sel,
    });
    if (d.sub) emit({ action: "freecamHint", hint: String(d.sub) });
  }

  function ensureExtras() {
    if (document.getElementById("aura-bridge-style")) return;
    var st = document.createElement("style");
    st.id = "aura-bridge-style";
    st.textContent =
      "#aura-gate-toast{position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:2147483000;background:rgba(8,8,8,.92);color:#fff;border:1px solid " +
      AURA_ACCENT +
      ";padding:10px 16px;font:600 13px/1.4 Segoe UI,sans-serif;display:none;max-width:70vw;text-align:center}" +
      "#aura-player-info{position:fixed;right:2vh;bottom:8vh;z-index:2147483000;width:220px;background:rgba(8,8,8,.9);color:#eee;border:1px solid rgba(255,255,255,.12);padding:8px 10px;font:12px/1.45 Segoe UI,sans-serif;display:none}" +
      "#aura-player-info b{color:" +
      AURA_ACCENT +
      ";display:block;margin-bottom:6px}";
    document.documentElement.appendChild(st);
    var toast = document.createElement("div");
    toast.id = "aura-gate-toast";
    document.documentElement.appendChild(toast);
    var info = document.createElement("div");
    info.id = "aura-player-info";
    document.documentElement.appendChild(info);
  }

  function showGate(msg) {
    ensureExtras();
    var el = document.getElementById("aura-gate-toast");
    if (!el) return;
    el.textContent = msg || "Aura Menu can't run on this server.";
    el.style.display = "block";
    clearTimeout(showGate._t);
    showGate._t = setTimeout(function () {
      el.style.display = "none";
    }, 4200);
  }

  function showPlayerInfo(d) {
    ensureExtras();
    var el = document.getElementById("aura-player-info");
    if (!el) return;
    var rows = [
      ["Name", d.name || d.character],
      ["SID", d.sid],
      ["Job", d.job],
      ["Health", d.health],
      ["Armor", d.armor],
      ["Weapon", d.weapon],
      ["Vehicle", d.vehicle],
      ["Dist", d.dist],
      ["Status", d.status],
    ];
    el.innerHTML =
      "<b>Aura</b>" +
      rows
        .map(function (r) {
          if (r[1] == null || r[1] === "") return "";
          return (
            "<div><span style='opacity:.6'>" +
            r[0] +
            "</span> " +
            String(r[1]) +
            "</div>"
          );
        })
        .join("");
    el.style.display = "block";
  }

  function hidePlayerInfo() {
    var el = document.getElementById("aura-player-info");
    if (el) el.style.display = "none";
  }

  function posFromPct(xPct, yPct) {
    var me = (window.innerHeight || 1080) / 100;
    var xVh = ((Number(xPct) || 0) / 100) * (window.innerWidth || 1920) / me;
    return { action: "updatePosition", x: xVh, y: Number(yPct) || 0 };
  }

  function applyLogoSwap() {
    var lg = window.__AURA_ARGS_LOGO;
    if (!lg) return;
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].getAttribute("src") || "";
      if (
        src.indexOf("aryamenu") >= 0 ||
        src.indexOf("auramenu.xyz/img/logo") >= 0
      ) {
        imgs[i].src = lg;
      }
    }
  }

  window.__auraShowGateToast = function (msg) {
    showGate(msg);
  };
  window.__auraShowPlayerInfo = function (d) {
    showPlayerInfo(d || {});
  };
  window.__auraHidePlayerInfo = hidePlayerInfo;
  window.__auraBrandAsAura = function () {};

  window.addEventListener(
    "message",
    function (ev) {
      var d = ev && ev.data;
      if (!d || typeof d !== "object" || !d.action) return;
      if (d.__auraNative) return;

      var a = d.action;
      var handled = true;

      if (a === "showUI") {
        if (d.visible === false) {
          emit({ action: "setVisible", visible: false });
        } else {
          emitSetCurrent(d, true);
          emit({ action: "setVisible", visible: true });
        }
      } else if (a === "updateElements") {
        emitSetCurrent(d, false);
      } else if (a === "updateCategories") {
        var tabs = mapTabs(d.categories);
        lastTabs = tabs;
        lastActiveTab = String((d.categoryIndex || 0) + 1);
        emit({
          action: "setTabs",
          tabs: tabs,
          activeTabId: lastActiveTab,
          showTabs: tabs.length > 1,
          headerLabel: lastHeader,
          isInTabbedMenu: tabs.length > 0,
          currentMenuLabel: lastHeader,
        });
      } else if (a === "setVisible") {
        handled = false;
      } else if (a === "displayFreecam" || a === "updateFreecam") {
        mapFreecam(d);
      } else if (a === "updateLoader") {
        var p = Number(d.percent) || 0;
        var msg = d.status || d.message || "Loading...";
        if (p >= 100) {
          emit({ action: "hideLoading" });
          loaderShown = false;
        } else {
          var payload = {
            progress: p,
            message: msg,
            brandName: AURA_NAME,
            logoUrl: logoUrl(),
            discordUsername: window.__AURA_DISCORD_NAME || lastUsername,
          };
          if (!loaderShown) {
            payload.action = "showLoading";
            loaderShown = true;
          } else {
            payload.action = "updateLoading";
          }
          emit(payload);
        }
      } else if (a === "updateKeyboard") {
        if (d.visible === false) {
          if (keyPickOpen) emit({ action: "closeKeySelection" });
          if (textOpen) emit({ action: "closeTextInput" });
          keyPickOpen = false;
          textOpen = false;
        } else if (d.menuKey === true) {
          if (!keyPickOpen) {
            emit({
              action: "openKeySelection",
              title: d.title || "Enter Menu Open Key",
              message: d.value || "",
            });
            keyPickOpen = true;
          }
          emit({
            action: "updateKeySelection",
            keyName: d.value || "",
          });
        } else {
          if (!textOpen) {
            emit({
              action: "openTextInput",
              title: d.title || "Input",
              placeholder: "",
              value: d.value || "",
            });
            textOpen = true;
          } else {
            emit({
              action: "updateTextInput",
              value: d.value || "",
              allSelected: false,
            });
          }
        }
      } else if (a === "displayBinds") {
        emit({ action: "toggleKeybindListUI", visible: d.visible === true });
        if (d.visible === true) {
          var binds = (d.binds || []).map(function (b) {
            return {
              name: b.label || b.name || "",
              key: b.keyLabel || b.key || "-",
              type: b.type,
              state: b.checked === true,
            };
          });
          emit({ action: "updateKeybindList", keybinds: binds });
        }
      } else if (a === "displaySpectators") {
        emit({
          action: "toggleSpectatorListUI",
          visible: d.visible === true,
        });
        emit({
          action: "updateSpectatorList",
          spectators: d.spectators || [],
        });
      } else if (a === "updateBanner") {
        emit({
          action: "updateBanner",
          bannerColor: toHexColor(d.bannerColor || d.color),
          bannerLink: d.bannerLink || d.link,
        });
      } else if (a === "showNotification" || a === "notify") {
        emit({
          action: "showNotification",
          type: d.type,
          title: d.title,
          message: d.message || d.desc || d.description || "",
          soundUrl: d.soundUrl,
        });
      } else if (a === "showGateToast") {
        showGate(d.message);
      } else if (a === "showPlayerInfo") {
        showPlayerInfo(d);
      } else if (a === "hidePlayerInfo") {
        hidePlayerInfo();
      } else if (a === "updateMenuSize") {
        emit({ action: "setMenuScale", scale: d.size });
      } else if (a === "updatePositionPrecise") {
        var pos = d.position || {};
        emit(posFromPct(pos.x, pos.y));
      } else if (a === "updateKeybindListPosition") {
        var kp = d.position || {};
        emit({
          action: "setOverlayPosition",
          panel: "keybindList",
          anchor: "top-left",
          x: kp.x,
          y: kp.y,
        });
      } else if (a === "updateSpectatorListPosition") {
        var sp = d.position || {};
        emit({
          action: "setOverlayPosition",
          panel: "spectatorList",
          anchor: "top-left",
          x: sp.x,
          y: sp.y,
        });
      } else if (a === "setMenuBackground" || a === "setCurrent" || a === "setTabs") {
        handled = false;
      } else {
        handled = false;
      }

      if (handled) {
        ev.stopImmediatePropagation();
      }
    },
    true
  );

  function boot() {
    ensureExtras();
    applyLogoSwap();
    document.documentElement.style.setProperty("--accent-color", AURA_ACCENT);
    document.documentElement.style.setProperty("--overlay-accent", AURA_ACCENT);
    document.documentElement.style.setProperty("--theme-accent", AURA_ACCENT);
    document.documentElement.style.setProperty("--theme-highlight", AURA_ACCENT);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setInterval(applyLogoSwap, 1200);
})();
