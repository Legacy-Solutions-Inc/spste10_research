/**
 * RFC 4122 v4 id generated on the device. Hermes has no crypto.randomUUID, and
 * these ids only need to be unique (access is enforced by RLS, not secrecy).
 * Creating the id up front lets a timed-out insert be retried without creating
 * a duplicate, and lets a report photo be uploaded before its row exists.
 */
export function newId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
