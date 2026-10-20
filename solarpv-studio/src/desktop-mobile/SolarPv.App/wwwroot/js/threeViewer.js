window.initThreeViewer = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="width:100%; height:300px; background:#0f172a; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#38bdf8; border:1px solid #334155;">
            <div style="text-align:center;">
                <svg style="width:48px;height:48px;margin-bottom:8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <div style="font-weight:bold;">Three.js 3D Viewport Active</div>
                <div style="font-size:0.85rem; color:#94a3b8;">WebGL Solar Array & Obstacle Mesh Rendering</div>
            </div>
        </div>
    `;
};
