/**
 * Liquid Ether Background - Animated background effect
 * Usage: Include this script in your HTML and call initLiquidBackground()
 */

function initLiquidBackground() {
    // Create background container
    const background = document.createElement('div');
    background.className = 'liquid-background';
    
    // Create floating blobs
    for (let i = 0; i < 4; i++) {
        const blob = document.createElement('div');
        blob.className = 'liquid-blob';
        background.appendChild(blob);
    }
    
    // Insert at the beginning of body
    document.body.insertBefore(background, document.body.firstChild);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiquidBackground);
} else {
    initLiquidBackground();
}
