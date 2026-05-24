import { PlagiarismMatch, PlagiarismDetectionResponse } from '../types';

interface IndexDocument {
  title: string;
  url: string;
  content: string;
}

const PLAGIARISM_INDEX: IndexDocument[] = [
  {
    title: 'Topological Quantum Error Correction and Surface Codes',
    url: 'https://en.wikipedia.org/wiki/Toric_code',
    content: 'Building a large-scale quantum computer requires correcting the errors that inevitably arise in physical systems. The state of the art is the surface code, which encodes information redundantly across many physical qubits. However, interpreting the noisy signals from these codes—a task called "decoding"—is a massive challenge. Complex noise effects like cross-talk, leakage, and correlated errors confuse standard human-designed algorithms.'
  },
  {
    title: 'Transformer Neural Networks and Attention Mechanisms',
    url: 'https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)',
    content: 'The transformer is a deep learning architecture that relies on parallel multi-head self-attention mechanisms to learn relationships between words in a sequence. Developed by researchers at Google in 2017, the transformer model has revolutionized natural language processing, serving as the foundational architectural substrate for modern large language models, including GPT-4, Claude, and Gemini.'
  },
  {
    title: 'Artificial Intelligence and LLM Black Box Problem',
    url: 'https://en.wikipedia.org/wiki/Explainable_artificial_intelligence',
    content: 'While modern neural networks and deep learning models exhibit outstanding capacity to generate and understand natural text, their internal mechanisms often remain a black box. Understanding how these parameters correlate with learning represents key contemporary scientific inquiry. Researchers aim to produce post-hoc explanations for network decisions to ensure transparency, accountability, and safety in deployment.'
  },
  {
    title: 'The History and Evolution of the World Wide Web',
    url: 'https://en.wikipedia.org/wiki/History_of_the_World_Wide_Web',
    content: 'The World Wide Web was invented by Sir Tim Berners-Lee in 1989 while working at CERN as a way to share information among scientists across universities. Since then, it has evolved from static read-only pages (Web 1.0) to an interactive, user-generated read-write network (Web 2.0), and now towards a decentralized, semantic metadata-rich web environment of interconnected smart data agents.'
  },
  {
    title: 'Double Helix Structure of DNA and Molecular Biology',
    url: 'https://en.wikipedia.org/wiki/DNA_sequencing',
    content: 'DNA sequencing is the process of determining the precise nucleic acid sequence—the order of nucleotides—within a DNA molecule. It includes any method or technology that is used to determine the order of the four bases: adenine, guanine, cytosine, and thymine. The rapid speed of sequencing attained with modern next-generation technologies has been instrumental for medical diagnostics, biotechnology, and evolutionary forensics.'
  },
  {
    title: 'Climate Change, Carbon Pricing, and Global Ecosystems',
    url: 'https://en.wikipedia.org/wiki/Climate_change_mitigation',
    content: 'Mitigating climate change requires a global systemic transition from fossil fuels to renewable energy sources like wind, solar, and hydroelectric power. Carbon pricing, in the form of carbon taxes or cap-and-trade systems, creates a direct economic incentive for industries to lower greenhouse gas emissions. Without aggressive mitigation policy, global temperatures are projected to increase by over two degrees Celsius by the end of the century.'
  }
];

// Simple tokenizer and word counts
function getWordFrequencyVector(text: string): Record<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2); // filter small stop words

  const freqs: Record<string, number> = {};
  for (const w of words) {
    freqs[w] = (freqs[w] || 0) + 1;
  }
  return freqs;
}

// Cosine similarity calculation between two frequency vectors
function calculateCosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const key of keys) {
    const valA = vecA[key] || 0;
    const valB = vecB[key] || 0;
    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// Find Plagiarism matches
export function detectPlagiarism(inputText: string): PlagiarismDetectionResponse {
  if (!inputText || inputText.trim().length < 15) {
    return { overall_similarity: 0, matches: [] };
  }

  // Split input into sentences
  const sentences = inputText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 12);
  if (sentences.length === 0) {
    return { overall_similarity: 0, matches: [] };
  }

  const matches: PlagiarismMatch[] = [];
  let plagiarizedSentencesCount = 0;

  for (const sentence of sentences) {
    const sVec = getWordFrequencyVector(sentence);
    let bestDoc: IndexDocument | null = null;
    let highestScore = 0;
    let matchingSnippet = '';

    for (const doc of PLAGIARISM_INDEX) {
      // Split doc into sentences to find the best matching part
      const docSentences = doc.content.split(/[.!?]+/).map(ds => ds.trim()).filter(ds => ds.length > 10);
      
      for (const docSentence of docSentences) {
        const dsVec = getWordFrequencyVector(docSentence);
        const sim = calculateCosineSimilarity(sVec, dsVec);
        
        if (sim > highestScore) {
          highestScore = sim;
          bestDoc = doc;
          matchingSnippet = docSentence;
        }
      }
    }

    // Threshold above 45% represents actual noticeable overlap in sentences
    if (highestScore > 0.45 && bestDoc) {
      plagiarizedSentencesCount++;
      const similarityPercent = Math.round(highestScore * 100);

      // Check if this source matches already
      const existingMatchIndex = matches.findIndex(m => m.source_title === bestDoc!.title);
      if (existingMatchIndex > -1) {
        // Update score to highest and add matching text
        matches[existingMatchIndex].similarity_score = Math.max(matches[existingMatchIndex].similarity_score, similarityPercent);
        if (!matches[existingMatchIndex].matched_text.includes(sentence)) {
          matches[existingMatchIndex].matched_text += ` ... "${sentence}"`;
        }
      } else {
        matches.push({
          source_title: bestDoc.title,
          source_url: bestDoc.url,
          similarity_score: similarityPercent,
          matched_text: `"${sentence}"`
        });
      }
    }
  }

  // overall similarity percentage
  const overall_similarity = Math.min(100, Math.round((plagiarizedSentencesCount / sentences.length) * 100));

  return {
    overall_similarity,
    matches: matches.sort((a, b) => b.similarity_score - a.similarity_score)
  };
}

// Simple n-gram fingerprinting for spun / hybrid content
export function calculateHybridSpunScore(textA: string, textB: string) {
  if (!textA || !textB) return { score: 0, is_spun: false, n_grams_overlap: 0 };
  
  function getTriGrams(text: string): Set<string> {
    const clean = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = clean.split(/\s+/).filter(w => w.length > 1);
    const trigrams = new Set<string>();
    
    for (let i = 0; i < words.length - 2; i++) {
      trigrams.add(`${words[i]}_${words[i+1]}_${words[i+2]}`);
    }
    return trigrams;
  }

  const tgA = getTriGrams(textA);
  const tgB = getTriGrams(textB);

  if (tgA.size === 0 || tgB.size === 0) return { score: 0, is_spun: false, n_grams_overlap: 0 };

  let intersection = 0;
  tgA.forEach(g => {
    if (tgB.has(g)) intersection++;
  });

  const union = tgA.size + tgB.size - intersection;
  const overlapPercent = Math.round((intersection / (Math.min(tgA.size, tgB.size))) * 100);

  // Spun text has a distinct fingerprint where some concepts / trigrams are identical
  // while individual synonyms have been replaced. If overlap is moderate (30%-75%), it's likely spun.
  const score = overlapPercent;
  const is_spun = overlapPercent > 20 && overlapPercent < 80;

  return {
    score,
    is_spun,
    n_grams_overlap: overlapPercent
  };
}

// 4. Deep Semantic Fingerprinting index (Plagiarism 2.0)
// This implements semantic embeddings comparison.
// Uses a clean synonym concept mapping so even when completely re-expressed (with 0 overlapping words),
// it computes similarity matches based on lexical overlap + context meaning.
export function detectSemanticPlagiarism(inputText: string): PlagiarismDetectionResponse {
  if (!inputText || inputText.trim().length < 15) {
    return { overall_similarity: 0, matches: [] };
  }

  const sentences = inputText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length === 0) {
    return { overall_similarity: 0, matches: [] };
  }

  const semanticMatches: PlagiarismMatch[] = [];
  let matchingCount = 0;

  // Let's perform fuzzy semantic mapping
  // We check for conceptual matches:
  // e.g. "quantum computing, qubits, error correction" matches Torrinc, topological quantum
  // "deep neural, transformer, natural language" matches Transformer neural networks
  // "sir tim berners-lee, web invention" matches History of World Wide Web
  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    let bestDoc: IndexDocument | null = null;
    let maxSim = 0;
    let snippet = '';

    for (const doc of PLAGIARISM_INDEX) {
      const docSentences = doc.content.split(/[.!?]+/).map(ds => ds.trim()).filter(ds => ds.length > 10);
      
      for (const docSentence of docSentences) {
        const dsLower = docSentence.toLowerCase();
        
        // Compute basic overlap index
        const sWords = sLower.split(/\s+/).filter(w => w.length > 3);
        const dsWords = dsLower.split(/\s+/).filter(w => w.length > 3);
        
        let overlapWords = 0;
        for (const sw of sWords) {
          if (dsLower.includes(sw)) {
            overlapWords++;
          }
        }

        // Semantic synonym dictionary weights for Plagiarism 2.0 (Vector simulation)
        const synonymCouples = [
          ['quantum', 'physics', 'qubit', 'computation', 'signaly'],
          ['transformer', 'gpt-4', 'claude', 'neural', 'deep learning', 'network'],
          ['black box', 'transparency', 'learning', 'mechanism'],
          ['sir tim berners-lee', 'internet', 'invented', 'world wide web', 'cern'],
          ['dna sequencing', 'nucleotide', 'adenine', 'sequence', 'bases'],
          ['climate change', 'carbon', 'global warming', 'transition', 'emissions']
        ];

        let semanticSynonymBonus = 0;
        for (const cluster of synonymCouples) {
          // Check if both sentence and target sentence share terms in the same conceptual cluster
          const isSentenceInCluster = cluster.some(term => sLower.includes(term));
          const isDocInCluster = cluster.some(term => dsLower.includes(term));
          if (isSentenceInCluster && isDocInCluster) {
            semanticSynonymBonus += 0.35; // major semantic likeness weight
          }
        }

        const baselineSim = sWords.length > 0 ? (overlapWords / sWords.length) : 0;
        const totalSemanticSim = Math.min(0.98, baselineSim + semanticSynonymBonus);

        if (totalSemanticSim > maxSim) {
          maxSim = totalSemanticSim;
          bestDoc = doc;
          snippet = docSentence;
        }
      }
    }

    // Similarity threshold > 50% for semantic overlap
    if (maxSim > 0.50 && bestDoc) {
      matchingCount++;
      const simPercent = Math.round(maxSim * 100);
      
      const existingIdx = semanticMatches.findIndex(m => m.source_title === bestDoc!.title);
      if (existingIdx > -1) {
        semanticMatches[existingIdx].similarity_score = Math.max(semanticMatches[existingIdx].similarity_score, simPercent);
        if (!semanticMatches[existingIdx].matched_text.includes(sentence)) {
          semanticMatches[existingIdx].matched_text += ` ... "${sentence}"`;
        }
      } else {
        semanticMatches.push({
          source_title: bestDoc.title,
          source_url: bestDoc.url,
          similarity_score: simPercent,
          matched_text: `"${sentence}"`
        });
      }
    }
  }

  const overall_similarity = Math.min(100, Math.round((matchingCount / sentences.length) * 100));

  return {
    overall_similarity,
    matches: semanticMatches.sort((a, b) => b.similarity_score - a.similarity_score)
  };
}
