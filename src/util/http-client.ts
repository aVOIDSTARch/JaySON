/**
 * @fileoverview HTTP Client - Network utilities for fetching remote resources
 * @module util/http-client
 * @description Provides HTTP/HTTPS utilities for fetching remote content,
 * including automatic redirect handling and internet connectivity checking.
 */

import * as https from "https";
import * as http from "http";

/**
 * Fetches content from a URL with automatic redirect handling.
 * Supports both HTTP and HTTPS protocols with configurable timeout.
 *
 * @param {string} url - The URL to fetch content from
 * @param {number} [timeout=30000] - Request timeout in milliseconds (default: 30 seconds)
 * @returns {Promise<string>} Promise resolving to the response body as a string
 * @throws {Error} If the request times out
 * @throws {Error} If the server returns an error status (4xx or 5xx)
 * @throws {Error} If a network error occurs
 *
 * @example
 * const content = await fetchUrl("https://json-schema.org/draft/2020-12/schema");
 * const schema = JSON.parse(content);
 */
export function fetchUrl(url: string, timeout: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;

        const request = protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                fetchUrl(response.headers.location, timeout)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode && response.statusCode >= 400) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            let data = "";
            response.on("data", (chunk) => {
                data += chunk;
            });
            response.on("end", () => {
                resolve(data);
            });
            response.on("error", reject);
        });

        request.on("error", reject);
        request.setTimeout(timeout, () => {
            request.destroy();
            reject(new Error("Request timeout"));
        });
    });
}

/**
 * Checks if internet connectivity is available by pinging a known endpoint.
 * Useful for determining if remote schema updates can be performed.
 *
 * @param {string} [testUrl="https://json-schema.org"] - URL to test connectivity against
 * @param {number} [timeout=5000] - Request timeout in milliseconds (default: 5 seconds)
 * @returns {Promise<boolean>} Promise resolving to true if internet is available
 *
 * @example
 * const hasInternet = await checkInternetAccess();
 * if (hasInternet) {
 *   await downloadLatestSchemas();
 * }
 */
export async function checkInternetAccess(testUrl: string = "https://json-schema.org", timeout: number = 5000): Promise<boolean> {
    try {
        await fetchUrl(testUrl, timeout);
        return true;
    } catch {
        return false;
    }
}
