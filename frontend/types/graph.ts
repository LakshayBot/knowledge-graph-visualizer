export interface GraphNode {
  id: string;
  title: string;
  summary?: string;
  domain?: string;
  eventDate?: string;
  confidenceScore?: number;
  perspectives?: string[];
  sources?: { url: string; title: string }[];
  incomingEdgeCount?: number;
  outgoingEdgeCount?: number;
  isVerified?: boolean;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  strength?: number;
  explanation?: string;
  perspective?: string;
  isContested?: boolean;
}

export interface SavedChain {
  chainId: string;
  chainTitle: string;
  domain: string;
  nodeCount: number;
  savedAt: string;
  notes: string | null;
}
