import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Patch de proteção do DOM para evitar exceções (removeChild / insertBefore)
// causadas por ferramentas de tradução de navegador ou extensões de terceiros
if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  if (Node.prototype.removeChild) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        if (child.parentNode) {
          return child.parentNode.removeChild(child) as T;
        }
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    };
  }

  if (Node.prototype.insertBefore) {
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (referenceNode.parentNode) {
          return referenceNode.parentNode.insertBefore(newNode, referenceNode) as T;
        }
        return newNode;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };
  }
}

createRoot(document.getElementById("root")!).render(<App />);
