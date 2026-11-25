/** Up to two uppercase initials from a name: "Asha Verma" → "AV", "sam" → "S". */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const letters =
    words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.map(word => word[0].toUpperCase()).join('');
}
