## 2025-02-17 - Icon-Only Button Accessibility
**Learning:** In extension interfaces, move/sort controls (like up/down arrows) are often implemented as icon-only buttons without accessible labels, making them invisible to screen readers.
**Action:** Always scan for unicode characters (like ⟰, ▲, ▼, ⟱) used as button content and enforce `aria-label` attributes to describe the action (e.g., "Move rule to top").
