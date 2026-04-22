const nextDistDir = process.env.NEXT_DIST_DIR;

const nextConfig = nextDistDir ? { distDir: nextDistDir } : {};

export default nextConfig;
