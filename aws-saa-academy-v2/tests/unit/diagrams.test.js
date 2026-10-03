import { describe, expect, it } from 'vitest';
import mermaid from 'mermaid';
import frDiagrams from '../../src/data/fr/diagramsData.json';
import enDiagrams from '../../src/data/en/diagramsData.json';

describe('diagrammes Mermaid', () => {
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  it.each([...frDiagrams.map((d) => ['fr', d.id, d]), ...enDiagrams.map((d) => ['en', d.id, d])])('%s %s est une syntaxe valide', async (_language, _id, diagram) => {
    await expect(mermaid.parse(diagram.mermaidCode)).resolves.toBeTruthy();
  });
});
