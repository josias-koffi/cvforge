const nextDistDir = process.env.NEXT_DIST_DIR;

const nextConfig = {
  ...(nextDistDir ? { distDir: nextDistDir } : {}),
  transpilePackages: ["@puckeditor/core"],
};

export default nextConfig;
