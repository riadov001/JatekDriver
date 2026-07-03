---
name: Livreur production build port collision
description: Why the Expo/livreur artifact's production build (scripts/build.js) could hang or fail during publishing
---

The livreur artifact's static-build script spawns its own internal Metro instance during production builds. If that internal Metro tries to bind to a port already used by another artifact's dev/prod service (e.g. the admin dashboard on 8081), Metro drops into an interactive "use another port?" prompt instead of failing cleanly — the build then hangs/fails silently since the process is non-interactive.

**Why:** All artifacts' services can be active in the same environment during publish, so any hardcoded port in a build script is a collision risk against other artifacts' assigned ports.

**How to apply:** The build script now uses an explicit `METRO_BUILD_PORT` (default 19001) passed via `--port` to `expo start`, kept out of the range used by other artifacts (check each artifact's `.replit-artifact/artifact.toml` `localPort` before picking one). If publishing hangs/fails again and build logs mention "Port X is being used by another process" or a non-interactive input prompt, suspect a new port collision the same way.
