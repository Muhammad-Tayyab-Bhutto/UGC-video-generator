"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVideoCompositionProps = validateVideoCompositionProps;
function validateVideoCompositionProps(props) {
    if (!props || typeof props !== 'object') {
        throw new Error('VideoCompositionProps must be a non-null object.');
    }
    const p = props;
    if (typeof p.hookText !== 'string' || !p.hookText.trim()) {
        throw new Error('VideoCompositionProps.hookText is required and cannot be empty.');
    }
    if (typeof p.bodyText !== 'string' || !p.bodyText.trim()) {
        throw new Error('VideoCompositionProps.bodyText is required and cannot be empty.');
    }
    if (typeof p.ctaText !== 'string' || !p.ctaText.trim()) {
        throw new Error('VideoCompositionProps.ctaText is required and cannot be empty.');
    }
    if (typeof p.backgroundUrl !== 'string' || !p.backgroundUrl.trim()) {
        throw new Error('VideoCompositionProps.backgroundUrl is required and cannot be empty.');
    }
    if (p.backgroundType !== 'image' && p.backgroundType !== 'video') {
        throw new Error('VideoCompositionProps.backgroundType must be either "image" or "video".');
    }
    if (typeof p.gifUrl !== 'string' || !p.gifUrl.trim()) {
        throw new Error('VideoCompositionProps.gifUrl is required and cannot be empty.');
    }
    if (typeof p.audioUrl !== 'string') {
        throw new Error('VideoCompositionProps.audioUrl must be a string.');
    }
    // URL format validation helper
    const isValidUrlOrPath = (urlStr) => {
        if (urlStr.startsWith('/') || urlStr.startsWith('./') || urlStr.startsWith('../')) {
            return true;
        }
        try {
            const parsed = new URL(urlStr);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        }
        catch {
            return false;
        }
    };
    if (!isValidUrlOrPath(p.backgroundUrl)) {
        throw new Error(`Invalid backgroundUrl format: "${p.backgroundUrl}"`);
    }
    if (!isValidUrlOrPath(p.gifUrl)) {
        throw new Error(`Invalid gifUrl format: "${p.gifUrl}"`);
    }
    if (p.audioUrl.trim() && !isValidUrlOrPath(p.audioUrl)) {
        throw new Error(`Invalid audioUrl format: "${p.audioUrl}"`);
    }
    return {
        hookText: p.hookText.trim(),
        bodyText: p.bodyText.trim(),
        ctaText: p.ctaText.trim(),
        backgroundUrl: p.backgroundUrl.trim(),
        backgroundType: p.backgroundType,
        gifUrl: p.gifUrl.trim(),
        audioUrl: p.audioUrl.trim(),
        durationInFrames: typeof p.durationInFrames === 'number' ? p.durationInFrames : 210,
        fps: typeof p.fps === 'number' ? p.fps : 30,
    };
}
