#!/usr/bin/env python3
"""
AETHERIA — Planetary Systems Intelligence Platform
tests/e2e_verify.py
Headless Chromium End-to-End Verification Suite (Tests A through P)
Verifies Desktop (1440x900), Mobile (390x844), No-WebGL 2D Fallback,
Story Mode Reactivity, 72h Storm Simulator, Editable CapEx & Payback,
Multi-Project Workspace + Undo, Interactive 3D Digital Twin Inspector,
Aetheria Intelligence (4-Way Matrix & Sensitivity), Discovery Lab,
5+ Embedded SVG Report Charts, 2-Min Demo, and Zero Obsolete Refs.
"""
import base64
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOT_DIR = ROOT / "tests" / "screenshots"
SHOT_DIR.mkdir(parents=True, exist_ok=True)


def find_chrome():
    for c in ["/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium-browser"]:
        if os.path.exists(c):
            return c
    raise RuntimeError("No headless Chromium binary found")


class CDPClient:
    def __init__(self, ws_url):
        import socket
        self.sock = socket.create_connection(("127.0.0.1", int(ws_url.split(":")[2].split("/")[0])), timeout=20)
        path = "/" + ws_url.split("/", 3)[3]
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)
        self._buf = resp.split(b"\r\n\r\n", 1)[1]
        self._id = 0
        self.console_errors = []

    def _recv_exact(self, n):
        while len(self._buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise EOFError("WebSocket closed")
            self._buf += chunk
        out, self._buf = self._buf[:n], self._buf[n:]
        return out

    def _read_msg(self):
        import struct
        while True:
            hdr = self._recv_exact(2)
            op = hdr[0] & 0x0F
            length = hdr[1] & 0x7F
            if length == 126:
                length = struct.unpack(">H", self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self._recv_exact(8))[0]
            payload = self._recv_exact(length)
            if op == 1:
                return json.loads(payload.decode("utf-8"))
            elif op == 9:
                self.sock.sendall(bytes([0x8A, 0]))

    def send(self, method, params=None):
        import struct
        self._id += 1
        cid = self._id
        data = json.dumps({"id": cid, "method": method, "params": params or {}}).encode("utf-8")
        mask = os.urandom(4)
        hdr = bytearray([0x81])
        L = len(data)
        if L < 126:
            hdr.append(0x80 | L)
        elif L < 65536:
            hdr.append(0x80 | 126)
            hdr.extend(struct.pack(">H", L))
        else:
            hdr.append(0x80 | 127)
            hdr.extend(struct.pack(">Q", L))
        hdr.extend(mask)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(bytes(hdr) + masked)
        while True:
            msg = self._read_msg()
            if msg.get("method") == "Runtime.exceptionThrown":
                self.console_errors.append(str(msg.get("params", {})))
            if msg.get("id") == cid:
                if "error" in msg:
                    raise RuntimeError(f"CDP error on {method}: {msg['error']}")
                return msg.get("result", {})

    def eval(self, expr):
        r = self.send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in r:
            raise RuntimeError(f"JS eval exception: {r['exceptionDetails']}")
        return r.get("result", {}).get("value")

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass


def launch_browser(chrome, extra_args=None):
    import socket
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    dbg_port = s.getsockname()[1]
    s.close()
    args = [
        chrome, "--headless=new", "--no-sandbox", "--disable-gpu-sandbox",
        f"--remote-debugging-port={dbg_port}", "--window-size=1440,900",
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ] + (extra_args or []) + ["about:blank"]
    proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ws_url = None
    for _ in range(50):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{dbg_port}/json", timeout=1) as r:
                tabs = json.loads(r.read().decode())
                for t in tabs:
                    if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                        ws_url = t["webSocketDebuggerUrl"]
                        break
            if ws_url:
                break
        except Exception:
            time.sleep(0.15)
    if not ws_url:
        proc.kill()
        raise RuntimeError("Chromium failed to expose DevTools WS")
    return proc, CDPClient(ws_url)


def main():
    chrome = find_chrome()
    base_url = f"file://{ROOT / 'index.html'}"

    # ---- TEST I: Static Audit (Zero obsolete references, single entry point) ----
    html_text = (ROOT / "index.html").read_text(encoding="utf-8")
    assert not (ROOT / "aetheria-studio.html").exists(), "Duplicate aetheria-studio.html must be removed"
    for obsolete in ["WorldEventHorizon", "55 Worlds", "Aetheria Studio v", "KeynoteDirector", "Armory of Ages"]:
        assert obsolete not in html_text, f"Found obsolete reference in index.html: {obsolete}"
    print("[PASS] Test I: Single entry point index.html verified; zero obsolete references.")

    proc, cdp = launch_browser(chrome)
    try:
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
        cdp.send("Page.navigate", {"url": base_url})
        for _ in range(30):
            if cdp.eval("document.readyState === 'complete' && !!window.__AETHERIA_APP__"):
                break
            time.sleep(0.15)

        assert cdp.eval("!!document.getElementById('btn-start-story') && !!document.getElementById('btn-start-planner')")

        # TEST J: Story Mode character reactivity
        cdp.eval("document.getElementById('btn-start-story').click()")
        time.sleep(0.15)
        cdp.eval("document.getElementById('btn-begin-m1').click()")
        time.sleep(0.2)
        char_m1 = cdp.eval("document.getElementById('story-char-card')?.innerText || ''")
        assert "Maya Chen" in char_m1 and "Lead-Acid" in char_m1
        cdp.eval("document.querySelector('[data-tech=\"lfp\"]').click()")
        time.sleep(0.2)
        char_m1_after = cdp.eval("document.getElementById('story-char-card')?.innerText || ''")
        assert "LFP" in char_m1_after and "85%" in char_m1_after
        print("[PASS] Test J: Story Mode character dialogue dynamically reflects real engineering choices.")

        # TEST M: Multi-Project Workspace (Duplicate + Rename)
        cdp.eval("document.getElementById('btn-mode-toggle').click(); window.__AETHERIA_APP__.navigate('hub');")
        time.sleep(0.2)
        cdp.eval("document.getElementById('proj-dup').click()")
        time.sleep(0.2)
        cdp.eval("document.querySelector('[data-tpl=\"home\"]').click()")
        time.sleep(0.2)
        cdp.eval("""(() => { const inp = document.getElementById('proj-name-inp'); inp.value = 'Vijayawada Eco Home'; document.getElementById('proj-rename').click(); })()""")
        time.sleep(0.2)
        ws_len = cdp.eval("window.__AETHERIA_APP__.getWorkspace().projects.length")
        assert ws_len >= 2, f"Expected >=2 projects, got {ws_len}"
        print(f"[PASS] Test M: Multi-Project Workspace verified ({ws_len} named projects active).")

        # TEST A + TEST N: Solar kWp change + Undo history
        cdp.eval("window.__AETHERIA_APP__.navigate('power')")
        time.sleep(0.2)
        cdp.eval("""(() => { const inp = document.getElementById('inp-kwp'); inp.value = '0.8'; inp.dispatchEvent(new Event('change')); })()""")
        time.sleep(0.15)
        before_a = cdp.eval("window.__AETHERIA_APP__.evaluate()")
        cdp.eval("""(() => { const inp = document.getElementById('inp-kwp'); inp.value = '4.5'; inp.dispatchEvent(new Event('change')); })()""")
        time.sleep(0.2)
        after_a = cdp.eval("window.__AETHERIA_APP__.evaluate()")
        assert after_a["electricity"]["dailySolarKwh"] > before_a["electricity"]["dailySolarKwh"]
        assert after_a["storage"]["totalGridOrUnservedKwh"] < before_a["storage"]["totalGridOrUnservedKwh"]
        # Test Undo restores 0.8 kWp, then re-apply 4.5 kWp
        cdp.eval("document.getElementById('btn-undo').click()")
        time.sleep(0.15)
        undone_kwp = cdp.eval("window.__AETHERIA_APP__.getState().electricity.installedKwp")
        assert abs(undone_kwp - 0.8) < 0.01, f"Undo failed: {undone_kwp}"
        cdp.eval("""(() => { const inp = document.getElementById('inp-kwp'); inp.value = '4.5'; inp.dispatchEvent(new Event('change')); })()""")
        time.sleep(0.15)
        print(f"[PASS] Test A & N: Solar PV change & Undo history verified (4.5->0.8->4.5 kWp).")

        # TEST B + TEST K: Night share + 72-Hour Storm Autonomy Simulator
        cdp.eval("window.__AETHERIA_APP__.navigate('storage')")
        time.sleep(0.2)
        before_b = cdp.eval("window.__AETHERIA_APP__.evaluate()")
        cdp.eval("""(() => { const inp = document.getElementById('st-nshare'); inp.value = '0.80'; inp.dispatchEvent(new Event('change')); })()""")
        time.sleep(0.2)
        after_b = cdp.eval("window.__AETHERIA_APP__.evaluate()")
        assert after_b["storage"]["backupHours"] < before_b["storage"]["backupHours"] or after_b["storage"]["unservedNightKwh"] > before_b["storage"]["unservedNightKwh"]
        storm_before = cdp.eval("window.__AETHERIA_APP__.simulateStorm()")
        cdp.eval("""(() => { const inp = document.getElementById('st-cap'); inp.value = '25'; inp.dispatchEvent(new Event('change')); })()""")
        time.sleep(0.2)
        storm_after = cdp.eval("window.__AETHERIA_APP__.simulateStorm()")
        assert storm_after["totalUnmetKwh"] < storm_before["totalUnmetKwh"] or storm_after["outageHours"] < storm_before["outageHours"]
        print(f"[PASS] Test B & K: Night storage & 72h Storm Simulator verified ({storm_before['outageHours']}h->{storm_after['outageHours']}h outage).")

        # TEST C: Water pumping head & leakage
        cdp.eval("window.__AETHERIA_APP__.navigate('water')")
        time.sleep(0.2)
        before_c = cdp.eval("window.__AETHERIA_APP__.evaluate()")
        cdp.eval("""(() => {
            const h = document.getElementById('w-head'); h.value = '60'; h.dispatchEvent(new Event('change'));
            const l = document.getElementById('w-leak'); l.value = '45'; l.dispatchEvent(new Event('change'));
        })()""")
        time.sleep(0.2)
        after_c = cdp.eval("window.__AETHERIA_APP__.evaluate()")
        assert after_c["water"]["pumpingKwhPerDay"] > before_c["water"]["pumpingKwhPerDay"]
        assert after_c["water"]["shortfallL"] > before_c["water"]["shortfallL"]
        print(f"[PASS] Test C: Water-Energy Nexus verified (pump {before_c['water']['pumpingKwhPerDay']}->{after_c['water']['pumpingKwhPerDay']} kWh/d).")

        # TEST O: Interactive 3D Digital Twin Landmark Inspector
        cdp.eval("window.__AETHERIA_APP__.inspectLandmark('solar')")
        time.sleep(0.2)
        twin_txt = cdp.eval("document.getElementById('twin-inspector').innerText")
        assert "Solar Microgrid Array" in twin_txt and "4.5 kWp" in twin_txt
        print("[PASS] Test O: 3D Digital Twin Landmark Inspector displays live calculated telemetry.")

        # TEST P: Aetheria Intelligence (4-Way Matrix & Sensitivity) + Scientific Discovery Lab
        cdp.eval("window.__AETHERIA_APP__.navigate('intelligence')")
        time.sleep(0.3)
        intel_txt = cdp.eval("document.getElementById('panel-body').innerText")
        assert "Root-Cause System Diagnostics" in intel_txt and "4-Way Architectural Comparison" in intel_txt and "Parametric Sensitivity Analysis" in intel_txt
        assert cdp.eval("document.querySelectorAll('#panel-body svg').length >= 2")
        cdp.eval("window.__AETHERIA_APP__.setCycleHour(17.5)")
        time.sleep(0.3)
        # Capture Desktop flagship screenshot (3D Community + Digital Twin Inspector + Intelligence Matrix/Sensitivity!)
        shot_d = cdp.send("Page.captureScreenshot", {"format": "png"})
        (SHOT_DIR / "aetheria_desktop.png").write_bytes(base64.b64decode(shot_d["data"]))

        cdp.eval("window.__AETHERIA_APP__.navigate('lab')")
        time.sleep(0.2)
        lab_txt = cdp.eval("document.getElementById('panel-body').innerText")
        assert "1. The Blackout Challenge" in lab_txt and "5. The 72-Hour Storm Resilience Challenge" in lab_txt
        print("[PASS] Test P: Aetheria Intelligence (4-Way Matrix + Sensitivity) & 5-Challenge Discovery Lab verified.")

        # TEST D & L: CapEx Budget + Side-by-Side Stress Comparison
        cdp.eval("window.__AETHERIA_APP__.navigate('future')")
        time.sleep(0.2)
        fut_txt = cdp.eval("document.getElementById('panel-body').innerText")
        assert "Affordability & Equipment CapEx Estimate" in fut_txt and "Side-by-Side Comparison" in fut_txt
        print("[PASS] Test D & L: CapEx payback & Side-by-Side stress comparison verified.")

        # TEST E: Reload persistence across multi-project workspace
        cdp.send("Page.reload", {"ignoreCache": True})
        time.sleep(0.35)
        for _ in range(30):
            if cdp.eval("document.readyState === 'complete' && !!window.__AETHERIA_APP__"):
                break
            time.sleep(0.15)
        restored = cdp.eval("window.__AETHERIA_APP__.getState()")
        assert restored["projectName"] == "Vijayawada Eco Home" and abs(restored["electricity"]["installedKwp"] - 4.5) < 0.01
        print("[PASS] Test E: Multi-project workspace & renamed project persisted cleanly across reload.")

        # TEST F: Professional Printable Report with >=5 embedded SVG charts
        cdp.eval("document.getElementById('btn-start-planner').click(); window.__AETHERIA_APP__.openReportModal();")
        time.sleep(0.3)
        rep_txt = cdp.eval("document.getElementById('report-preview').innerText")
        svg_count = cdp.eval("document.querySelectorAll('#report-preview svg').length")
        assert "Vijayawada Eco Home" in rep_txt and "Four-Way Architectural Scenario Comparison" in rep_txt and "Parametric Sensitivity Analysis" in rep_txt
        assert svg_count >= 5, f"Expected >=5 embedded SVG charts in report, got {svg_count}"
        cdp.eval("document.getElementById('btn-close-report').click()")
        print(f"[PASS] Test F: Preliminary Engineering Report verified with {svg_count} embedded SVG charts.")

        # TEST H: 2-Min Judge Demo completes cleanly across all 5 steps -> Report
        cdp.eval("window.__AETHERIA_APP__.startJudgeDemo()")
        time.sleep(0.2)
        for _ in range(5):
            assert cdp.eval("document.getElementById('demo-banner').classList.contains('visible')")
            cdp.eval("document.getElementById('demo-next').click()")
            time.sleep(0.2)
        assert cdp.eval("!document.getElementById('report-overlay').classList.contains('hidden')")
        cdp.eval("document.getElementById('btn-close-report').click()")
        print("[PASS] Test H: 2-Min Judge Demo ran cleanly across all 5 steps to final report.")

        # Capture Mobile (390x844) screenshot
        cdp.send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
        cdp.eval("window.__AETHERIA_APP__.navigate('intelligence')")
        time.sleep(0.4)
        shot_m = cdp.send("Page.captureScreenshot", {"format": "png"})
        (SHOT_DIR / "aetheria_mobile.png").write_bytes(base64.b64decode(shot_m["data"]))

        assert not cdp.console_errors, f"Uncaught JS errors: {cdp.console_errors}"
    finally:
        cdp.close()
        proc.kill()
        proc.wait()

    # ---- TEST G: Non-WebGL Device Fallback Verification ----
    proc2, cdp2 = launch_browser(chrome, extra_args=["--disable-webgl", "--disable-webgl2"])
    try:
        cdp2.send("Page.enable")
        cdp2.send("Runtime.enable")
        cdp2.send("Page.navigate", {"url": base_url})
        for _ in range(30):
            if cdp2.eval("document.readyState === 'complete' && !!window.__AETHERIA_APP__"):
                break
            time.sleep(0.15)
        is_2d = cdp2.eval("document.body.classList.contains('mode-2d')")
        has_svg = cdp2.eval("!!document.querySelector('#fallback-2d svg')")
        eval_ok = cdp2.eval("window.__AETHERIA_APP__.evaluate().electricity.dailyDemandKwh > 0")
        assert is_2d and has_svg and eval_ok
        assert not cdp2.console_errors, f"No-WebGL JS errors: {cdp2.console_errors}"
        print("[PASS] Test G: WebGL-disabled browser cleanly activated 2D SVG fallback with 0 errors.")
    finally:
        cdp2.close()
        proc2.kill()
        proc2.wait()

    print("ALL FLAGSHIP E2E VERIFICATION TESTS (A through P) PASSED!")


if __name__ == "__main__":
    main()
