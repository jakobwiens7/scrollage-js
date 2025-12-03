/**
 * Optimized Easing Functions by Michael "Code Poet" Pohoreski, aka Michaelangel007
 * https://github.com/Michaelangel007/easing
 */ 

const EasingFuncs = {
    sinein: (p) => 1 - Math.cos(p * Math.PI * 0.5),
	sineout: (p) => Math.sin(p * Math.PI * 0.5),
    sineinout: (p) => 0.5 * (1 - Math.cos(p * Math.PI)),
    cubicin: (p) => p * p * p,
    cubicout: (p) => {
        const m = p - 1;
        return 1 + m * m * m;
    },
    cubicinout: (p) => {
        const m = p - 1, t = p * 2;
        return t < 1 ? p * t * t : 1 + m * m * m * 4;
    },
    quinticin: (p) => p * p * p * p * p,
    quinticout: (p) => {
        const m = p - 1;
        return 1 + m * m * m * m * m;
    },
    quinticinout: (p) => {
        const m = p - 1, t = p * 2;
        return t < 1 ? p * t * t * t * t : 1 + m * m * m * m * m * 16;
    },
    circlein: (p) => 1 - Math.sqrt(1 - p * p),
    circleout: (p) => {
        const m = p - 1;
        return Math.sqrt(1 - m * m);
    },
    circleinout: (p) => {
        const m = p - 1, t = p * 2;
        return t < 1 ? (1 - Math.sqrt(1 - t * t)) * 0.5 : (Math.sqrt(1 - 4 * m * m) + 1) * 0.5;
    },
    backin: (p) => {
        const k = 1.70158;
        return p * p * (p * (k + 1) - k);
    },
    backout: (p) => {
        const m = p - 1, k = 1.70158;
        return 1 + m * m * (m * (k + 1) + k);
    },
    backinout: (p) => {
        const m = p - 1, t = p * 2, k = 1.70158 * 1.525;
        return p < 0.5 ? p * t * (t * (k + 1) - k) : 1 + 2 * m * m * (2 * m * (k + 1) + k);
    },
    bouncein: (p) => 1 - EasingFuncs.OutBounce(1 - p),
    bounceout: (p) => {
        const r = 1 / 2.75, k0 = 7.5625, t = 0;
        if (p < r) return k0 * p * p;
        else if (p < 2 * r) return k0 * (t = p - 1.5 * r) * t + 0.75;
        else if (p < 2.5 * r) return k0 * (t = p - 2.25 * r) * t + 0.9375;
        else return k0 * (t = p - 2.625 * r) * t + 0.984375;
    },
    bounceinout: (p) => {
        const t = p * 2;
        return t < 1
            ? 0.5 - 0.5 * EasingFuncs.OutBounce(1 - t)
            : 0.5 + 0.5 * EasingFuncs.OutBounce(t - 1);
    },
    elasticin: (p) => {
        const m = p - 1;
        return -Math.pow(2, 10 * m) * Math.sin((m * 40 - 3) * Math.PI / 6);
    },
    elasticout: (p) => 1 + Math.pow(2, -10 * p) * Math.sin((-p * 40 - 3) * Math.PI / 6),
    elasticinout: (p) => {
        const s = 2 * p - 1, k = (80 * s - 9) * Math.PI / 18;
        return s < 0
            ? -0.5 * Math.pow(2, 10 * s) * Math.sin(k)
            : 1 + 0.5 * Math.pow(2, -10 * s) * Math.sin(k);
    },
};

export default EasingFuncs;
