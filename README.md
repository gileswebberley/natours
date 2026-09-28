# Natours

Project that I'm building as I go through the Udemy Node.js, Express, MongoDB and More course

## Not just following a course

This course was created in 2019 and although it's sold as updated I found it was far from so. Essentially I have updated the contents as I have followed along to be using Mongoose 9, Express 5, and ES Modules. I have used AI quite extensively to question the examples given whenever a new concept or package was introduced whilst also using it to help with reviewing significant code changes that I made. The API that we created is fairly fully implemented although we do not use all of the endpoints within the final project as it is purely for demonstrating concepts. I hope this goes someway towards proving my ability to pick up complex concepts and act on what I learn.

Here's what Gemini said about my changes when I fed it just my version of the authController and app files. On top of this I have made changes to the styling to make the front-end responsive allowing it to be viewed on all screen sizes down to the smallest of modern smartphones. I also integrated Leaflet to replace the use of MapBox and added Cloudinary storage pipeline for image uploads. I have used it as a jumping-off point to research and challenge myself to understand back-end development, at least to an entry-level grade -

# Natours (Production-Hardened & Express 5 Modernised Edition)

A robust, enterprise-grade full-stack tour booking application featuring a RESTful API and a dynamic, server-side rendered frontend view pipeline. This project originally began as part of Jonas Schmedtmann's _Complete Node.js Bootcamp_ on Udemy and has since been completely re-engineered to run on **Node.js (v22+)** and **Express v5.x**, while hardened with comprehensive production security configurations.

## Key Modernisations & Express 5 Engineering Workarounds

While the architectural blueprint relies on Node, Express, and MongoDB, this codebase solves significant version-migration challenges, shifting away from legacy tutorial implementations toward modern backend engineering patterns.

### 1. Advanced Express v5.x Compatibility Framework

Migrating to Express 5 introduces breaking paradigm shifts regarding object immutability and routing. This codebase explicitly implements architectural patches to bridge those gaps:

- **Query Object Mutation Interceptor**: In Express 5, `req.query` is treated as an immutable object. To prevent upstream middleware crashes, a custom runtime patch uses `Object.defineProperty` to unlock and intercept the query stream, setting descriptor properties (`writable: true`, `configurable: true`) to clone and safely process parameters.
- **Extended Query Parameter Mapping**: Explicitly overrides framework defaults via `app.set('query parser', 'extended')` to seamlessly evaluate deep query structures (e.g., advanced logical filters like `duration[gte]=5`).
- **Express 5 Strict Parameter Splatting**: Replaces legacy regular expression wildcards (`*`) with the strict new Express 5 catch-all pattern (`/*splat`) to process dead-end routes via the unified `AppError` pipeline.
- **Native Runtime Module Paths**: Resolves the lack of CommonJS globals in ES Modules by manually extracting system pointers using `fileURLToPath(import.meta.url)` to securely construct file system targets for the Pug compilation layer.

### 2. Modern Tooling & Asset Orchestration (Node.js v22+)

- **Native Runtime Utilities**: Drops bloated dependencies like `dotenv` and `nodemon` in favour of native Node runtime flags, utilizing `--env-file` for environment sandboxing and `--watch` for native development hot-reloads.
- **Zero-Build ESM Static Bundling**: Configures an elegant script delivery ecosystem, making dependencies available directly from the project's internal asset tree as pure ES Modules (`/js/axios.js` served from local node modules maps).

### 3. Industry-Grade Account Security & Anti-Hijacking Infrastructure

The authentication pipeline (`authController.js`) was engineered from scratch to actively eliminate high-impact profile takeover vectors:

- **Timing Attack Shielding**: Introduces an asynchronous workload balancer (`mimicWorkTime`) during failed credential queries and registration collisions, rendering database account enumeration impossible by removing predictable server speed variations.
- **Two-Way Tokenized Email Migration**: Replaces insecure in-place string edits with a non-destructive verification process, concurrently generating an `emailResetToken` to confirm the new inbox and an `emailRevertToken` to safeguard the old inbox.
- **Forced Session Termination & Clawback**: Grants target profiles an emergency `revertEmail` route. Using it zeroes out active modification keys, removes transaction freezes, and forcefully dials back `passwordChangedAt` to globally invalidate black-hat JWT browser tokens instantly.
- **Granular Production Helmet CSP**: Features an extensively customized Content Security Policy layout matching standard production criteria—securing cross-origin referrals while whitelisting styles, OpenStreetMap map layers (`*.tile.openstreetmap.org`), Leaflet execution blobs, and Cloudinary media buckets (`res.cloudinary.com`).
- **Unified Request Sanitization Engine**: Replaces deprecated dependencies (`xss-clean`) with an actively maintained **`perfect-express-sanitizer`** processing layer, configuring deep object sanitization across keys and payloads at structural protection level 5.

---

## 📊 Feature Comparison Matrix

| Feature Area             | Baseline Course Implementation    | My Modernised Express 5 Architecture                          |
| :----------------------- | :-------------------------------- | :------------------------------------------------------------ |
| **Modules System**       | CommonJS (`require`)              | **Native ES Modules (`import/export`)**                       |
| **Node Automation**      | `nodemon` & `dotenv` packages     | **Native `--env-file` and `--watch` runtime flags**           |
| **Express Engine**       | Express v4.x Base                 | **Express v5.x Pipeline (Async Error Resolution)**            |
| **Query Manipulation**   | Implicit Mutable Parsing          | **Object Property Interceptor (`Object.defineProperty`)**     |
| **Wildcard Routing**     | Simple Asterisk Mapping (`*`)     | **Strict Express 5 Splat Strategy (`/*splat`)**               |
| **Media Pipeline**       | Local Disk Read/Write Cycles      | **Cloudinary Cloud Media Service Core Platform**              |
| **Sanitization Layer**   | Deprecated Packages (`xss-clean`) | **`perfect-express-sanitizer` (Level 5 Protections)**         |
| **Security Headers**     | Basic Out-of-the-box Helmet       | **Custom Content Security Policy (Leaflet/Cloudinary)**       |
| **Session Invalidation** | Expiry-based Cookie Deletion      | **Global State Force-Reset (`passwordChangedAt`) Revocation** |

---

## 🛠️ Tech Stack & Architecture Map

- **Runtime Framework:** Node.js (>= v22.20.0 Core)
- **API Framework:** Express v5.2+, Mongoose v9.4+ (MongoDB Driver)
- **Security & Mitigation:** BcryptJS, JSONWebToken, Validator, Helmet (Custom CSP), HPP, Perfect-Express-Sanitizer
- **View Processing Engine:** Pug View Compiler, Dynamic Local Path Handlers (`res.locals.currentPath`)
- **Static Asset Pipelines:** Native Cookie-Parser, URL Encoded Form Data Parsers (10kb Safety Thresholds)
- **Quality Configurations:** ESLint (v10 Flat Config Architecture), Prettier, Airbnb Code Consistency Guidelines
