# Open Board Format

TypeScript definitions for the [Open Board Format (OBF)](https://www.openboardformat.org), a standard for sharing communication boards and board sets between Augmentative and Alternative Communication (AAC) applications.

This package ensures consistent, type-safe integration of OBF in your projects, simplifying development for AAC tools and platforms.

## Installation

```bash
npm install open-board-format
```

## Usage

```typescript
import { Board, Button, Image, Sound } from "open-board-format";

// Example usage
const board: Board = {
  format: "open-board-0.1",
  id: "unique-board-id",
  locale: "en",
  buttons: [],
  // ... other properties
};
```

## Links

- [Official OBF specification](https://www.openboardformat.org/docs)
