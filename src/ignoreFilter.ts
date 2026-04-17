/**
 * Gitignore-style pattern matching for vault paths.
 *
 * Supported syntax:
 *   /images       — match only at vault root
 *   images        — match at any depth
 *   images/       — match only directories named "images"
 *   *.draft.md    — glob wildcard (* and ?)
 *   !important    — negation (un-ignore a previously ignored path)
 *   # comment     — ignored
 */

export interface IgnorePattern {
    raw: string;
    isNegated: boolean;
    isAbsolute: boolean;       // pattern started with /
    isDirectoryOnly: boolean;  // pattern ended with /
    segments: string[];
    hasWildcard: boolean;
}

export function parseIgnorePatterns(text: string): IgnorePattern[] {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .map(parsePattern);
}

function parsePattern(raw: string): IgnorePattern {
    let pattern = raw;

    const isNegated = pattern.startsWith("!");
    if (isNegated) pattern = pattern.slice(1);

    const isAbsolute = pattern.startsWith("/");
    if (isAbsolute) pattern = pattern.slice(1);

    const isDirectoryOnly = pattern.endsWith("/");
    if (isDirectoryOnly) pattern = pattern.slice(0, -1);

    const segments = pattern.split("/").filter((s) => s.length > 0);
    const hasWildcard = raw.includes("*") || raw.includes("?");

    return { raw, isNegated, isAbsolute, isDirectoryOnly, segments, hasWildcard };
}

/**
 * Returns true if the given vault-relative path should be excluded.
 *
 * @param vaultPath   Vault-relative path without leading slash, e.g. "images/photo.png"
 * @param isDirectory Whether the path refers to a folder
 * @param patterns    Parsed ignore patterns (applied in order; last match wins)
 */
export function shouldIgnore(
    vaultPath: string,
    isDirectory: boolean,
    patterns: IgnorePattern[]
): boolean {
    const parts = vaultPath.replace(/^\//, "").split("/");
    let ignored = false;

    for (const pattern of patterns) {
        if (matchPattern(pattern, parts, isDirectory)) {
            ignored = !pattern.isNegated;
        }
    }

    return ignored;
}

function matchPattern(
    pattern: IgnorePattern,
    parts: string[],
    isDirectory: boolean
): boolean {
    // Directory-only patterns skip non-directories
    if (pattern.isDirectoryOnly && !isDirectory) return false;

    if (pattern.isAbsolute) {
        return matchSegments(pattern.segments, parts, 0);
    }

    // Non-absolute patterns can match at any depth
    for (let i = 0; i <= parts.length - pattern.segments.length; i++) {
        if (matchSegments(pattern.segments, parts, i)) return true;
    }
    return false;
}

function matchSegments(
    segments: string[],
    parts: string[],
    startIndex: number
): boolean {
    if (startIndex + segments.length > parts.length) return false;
    for (let i = 0; i < segments.length; i++) {
        if (!matchSegment(segments[i], parts[startIndex + i])) return false;
    }
    return true;
}

function matchSegment(pattern: string, value: string): boolean {
    if (!pattern.includes("*") && !pattern.includes("?")) {
        return pattern === value;
    }
    // Convert glob pattern to regex
    const regexStr = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");
    return new RegExp(`^${regexStr}$`).test(value);
}
