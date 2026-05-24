import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Document, Team, UserWritingDNA, AutomationRule } from '../types';

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface Schema {
  users: Record<string, User & { passwordHash: string }>;
  documents: Record<string, Document>;
  teams: Record<string, Team>;
  userWritingDNAs: Record<string, UserWritingDNA>;
  automations: Record<string, AutomationRule>;
}

class Database {
  private data: Schema = { users: {}, documents: {}, teams: {}, userWritingDNAs: {}, automations: {} };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.userWritingDNAs) this.data.userWritingDNAs = {};
        if (!this.data.automations) this.data.automations = {};
        console.log('Database loaded successfully with', Object.keys(this.data.users).length, 'users');
        return;
      } catch (e) {
        console.error('Failed to load database, recreating...', e);
      }
    }

    // Initialize with default seeds
    const hashedPassword = bcrypt.hashSync('password123', 10);
    
    const user1Id = 'u_saeed';
    const user2Id = 'u_collab';

    const defaultUsers: Schema['users'] = {
      [user1Id]: {
        id: user1Id,
        email: 'saeedullahbacha049@gmail.com',
        name: 'Saeedullah Bacha',
        credits_used: 1240,
        total_credits: 50000,
        passwordHash: hashedPassword,
        subscription_tier: 'Premium'
      },
      [user2Id]: {
        id: user2Id,
        email: 'collaborator@omniscribe.com',
        name: 'Alex Rivera',
        credits_used: 450,
        total_credits: 50000,
        passwordHash: hashedPassword,
        subscription_tier: 'Premium'
      }
    };

    const teamId = 't_alpha';
    const defaultTeams: Schema['teams'] = {
      [teamId]: {
        id: teamId,
        name: 'Quantum NLP Labs',
        owner_id: user1Id,
        members: [
          { id: user1Id, email: 'saeedullahbacha049@gmail.com', name: 'Saeedullah Bacha', role: 'owner' },
          { id: user2Id, email: 'collaborator@omniscribe.com', name: 'Alex Rivera', role: 'member' }
        ]
      }
    };

    const docId1 = 'd_quantum_paper';
    const docId2 = 'd_ai_essay';

    const defaultDocs: Schema['documents'] = {
      [docId1]: {
        id: docId1,
        title: 'Decoding the Quantum Frontier',
        content: 'Building a large-scale quantum computer requires correcting the errors that inevitably arise in physical systems. The state of the art is the surface code, which encodes information redundantly across many physical qubits. However, interpreting the noisy signals from these codes—a task called "decoding"—is a massive challenge. Complex noise effects like cross-talk and leakage confuse standard algorithms.',
        owner_id: user1Id,
        team_id: teamId,
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
        version: 1,
        comments: [
          {
            id: 'c_1',
            doc_id: docId1,
            user_id: user2Id,
            user_name: 'Alex Rivera',
            range_start: 110,
            range_end: 122,
            text: 'We should specify that we mean topological surface codes here.',
            selectedText: 'surface code',
            created_at: new Date(Date.now() - 3600000 * 4).toISOString()
          }
        ],
        snapshots: [
          {
            id: 's_1',
            doc_id: docId1,
            content: 'Building a large-scale quantum computer requires correcting the errors that arise. Decoding is a massive challenge.',
            version: 1,
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            author_name: 'Alex Rivera'
          }
        ]
      },
      [docId2]: {
        id: docId2,
        title: 'The Future of Neural Networks',
        content: 'In recent years, artificial intelligence has witnessed an unprecedented surge in progress, primarily driven by deep neural architectures like transformer models. While these models exhibit outstanding capacity to generate and understand natural text, their internal mechanisms often remain a black box. Understanding how these parameters correlate with learning represents key contemporary scientific inquiry.',
        owner_id: user1Id,
        team_id: null,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
        version: 1,
        comments: [],
        snapshots: []
      }
    };

    this.data = {
      users: defaultUsers,
      documents: defaultDocs,
      teams: defaultTeams,
      userWritingDNAs: {},
      automations: {}
    };

    this.save();
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save database:', e);
    }
  }

  // User Operations
  getUserById(id: string) {
    const user = this.data.users[id];
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  getUserWithHash(email: string) {
    return Object.values(this.data.users).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  createUser(email: string, passwordPlain: string, name: string): SafeUser {
    const id = 'u_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = bcrypt.hashSync(passwordPlain, 10);
    
    this.data.users[id] = {
      id,
      email,
      name,
      credits_used: 0,
      total_credits: 50000,
      passwordHash,
      subscription_tier: 'Premium'
    };
    this.save();
    return this.getUserById(id)!;
  }

  updateCredits(id: string, amount: number) {
    const user = this.data.users[id];
    if (user) {
      user.credits_used = Math.min(user.total_credits, user.credits_used + amount);
      this.save();
    }
  }

  // Document Operations
  getDocument(id: string) {
    return this.data.documents[id] || null;
  }

  getDocumentsForUser(userId: string) {
    // Get user's own docs + documents belonging to teams this user is a member of
    const userTeams = Object.values(this.data.teams).filter(team => 
      team.owner_id === userId || team.members.some(m => m.id === userId)
    );
    const teamIds = userTeams.map(t => t.id);

    return Object.values(this.data.documents).filter(doc => 
      doc.owner_id === userId || (doc.team_id && teamIds.includes(doc.team_id))
    );
  }

  createDocument(title: string, content: string, ownerId: string, teamId: string | null = null) {
    const id = 'd_' + Math.random().toString(36).substr(2, 9);
    const doc: Document = {
      id,
      title: title || 'Untitled Document',
      content: content || '',
      owner_id: ownerId,
      team_id: teamId,
      created_at: new Date().toISOString(),
      version: 1,
      comments: [],
      snapshots: []
    };
    this.data.documents[id] = doc;
    this.save();
    return doc;
  }

  updateDocument(id: string, content: string, title?: string) {
    const doc = this.data.documents[id];
    if (!doc) return null;
    
    doc.content = content;
    if (title !== undefined) doc.title = title;
    doc.version += 1;
    
    this.save();
    return doc;
  }

  deleteDocument(id: string) {
    delete this.data.documents[id];
    this.save();
    return true;
  }

  saveSnapshot(docId: string, content: string, authorName: string) {
    const doc = this.data.documents[docId];
    if (!doc) return null;

    const snapshotId = 's_' + Date.now();
    const snapshot = {
      id: snapshotId,
      doc_id: docId,
      content,
      version: doc.version,
      created_at: new Date().toISOString(),
      author_name: authorName
    };

    doc.snapshots.unshift(snapshot);
    // Limit to last 15 versions to keep DB size reasonable
    if (doc.snapshots.length > 15) {
      doc.snapshots.pop();
    }
    this.save();
    return snapshot;
  }

  // Comment Operations
  addComment(docId: string, userId: string, userName: string, range_start: number, range_end: number, text: string, selectedText: string) {
    const doc = this.data.documents[docId];
    if (!doc) return null;

    const comment = {
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      doc_id: docId,
      user_id: userId,
      user_name: userName,
      range_start,
      range_end,
      text,
      selectedText,
      created_at: new Date().toISOString()
    };

    doc.comments.push(comment);
    this.save();
    return comment;
  }

  deleteComment(docId: string, commentId: string) {
    const doc = this.data.documents[docId];
    if (!doc) return false;

    doc.comments = doc.comments.filter(c => c.id !== commentId);
    this.save();
    return true;
  }

  // Team Operations
  getTeam(id: string) {
    return this.data.teams[id] || null;
  }

  getTeamsForUser(userId: string) {
    return Object.values(this.data.teams).filter(team => 
      team.owner_id === userId || team.members.some(m => m.id === userId)
    );
  }

  createTeam(name: string, ownerId: string) {
    const id = 't_' + Math.random().toString(36).substr(2, 9);
    const owner = this.getUserById(ownerId);
    if (!owner) return null;

    const team: Team = {
      id,
      name,
      owner_id: ownerId,
      members: [
        { id: owner.id, email: owner.email, name: owner.name, role: 'owner' }
      ]
    };

    this.data.teams[id] = team;
    this.save();
    return team;
  }

  inviteTeamMember(teamId: string, email: string) {
    const team = this.data.teams[teamId];
    if (!team) return { success: false, error: 'Team not found' };

    // Find registered user by email
    const registeredUser = Object.values(this.data.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!registeredUser) {
      return { success: false, error: 'User is not registered on OmniScribe. Ask them to sign up first!' };
    }

    if (team.members.some(m => m.id === registeredUser.id)) {
      return { success: false, error: 'User is already a member of this team' };
    }

    team.members.push({
      id: registeredUser.id,
      email: registeredUser.email,
      name: registeredUser.name,
      role: 'member'
    });

    this.save();
    return { success: true, team };
  }

  removeTeamMember(teamId: string, memberId: string) {
    const team = this.data.teams[teamId];
    if (!team) return null;

    if (team.owner_id === memberId) {
      return { success: false, error: 'Cannot remove the owner of the team' };
    }

    team.members = team.members.filter(m => m.id !== memberId);
    this.save();
    return { success: true, team };
  }

  // Writing DNA Operations
  getUserWritingDNA(userId: string): UserWritingDNA | null {
    if (!this.data.userWritingDNAs) this.data.userWritingDNAs = {};
    return this.data.userWritingDNAs[userId] || null;
  }

  saveUserWritingDNA(userId: string, styleDescriptor: string, traits: Record<string, number>, signaturePhrases: string[]): UserWritingDNA {
    if (!this.data.userWritingDNAs) this.data.userWritingDNAs = {};
    const dna: UserWritingDNA = {
      userId,
      styleDescriptor,
      traits,
      signaturePhrases
    };
    this.data.userWritingDNAs[userId] = dna;
    this.save();
    return dna;
  }

  // Automations Workflow Operations
  getAutomations(userId: string): AutomationRule[] {
    if (!this.data.automations) this.data.automations = {};
    return Object.values(this.data.automations).filter(auto => auto.userId === userId);
  }

  createAutomation(
    userId: string,
    name: string,
    trigger: 'new_doc' | 'doc_save' | 'high_ai_score',
    action: 'send_email' | 'post_slack' | 'run_paraphrase' | 'notify_team',
    triggerDetails?: string,
    actionDetails?: string
  ): AutomationRule {
    if (!this.data.automations) this.data.automations = {};
    const id = 'auto_' + Math.random().toString(36).substr(2, 9);
    const rule: AutomationRule = {
      id,
      userId,
      name,
      trigger,
      action,
      triggerDetails: triggerDetails || '',
      actionDetails: actionDetails || '',
      active: true
    };
    this.data.automations[id] = rule;
    this.save();
    return rule;
  }

  deleteAutomation(userId: string, id: string): boolean {
    if (!this.data.automations) return false;
    const rule = this.data.automations[id];
    if (rule && rule.userId === userId) {
      delete this.data.automations[id];
      this.save();
      return true;
    }
    return false;
  }

  toggleAutomation(userId: string, id: string): AutomationRule | null {
    if (!this.data.automations) return null;
    const rule = this.data.automations[id];
    if (rule && rule.userId === userId) {
      rule.active = !rule.active;
      this.save();
      return rule;
    }
    return null;
  }

  // Subscription Toggles
  upgradeSubscription(userId: string, tier: 'Free' | 'Premium'): SafeUser | null {
    const user = this.data.users[userId];
    if (user) {
      user.subscription_tier = tier;
      this.save();
      return this.getUserById(userId);
    }
    return null;
  }

  // Document Branching Operations
  createDocumentBranch(userId: string, docId: string, branchName: string): Document | null {
    const original = this.data.documents[docId];
    if (!original) return null;

    const newDocId = 'd_branch_' + Math.random().toString(36).substr(2, 9);
    const docBranch: Document = {
      ...original,
      id: newDocId,
      title: `${original.title} (${branchName})`,
      branch_name: branchName,
      created_at: new Date().toISOString(),
      comments: [],
      snapshots: []
    };
    this.data.documents[newDocId] = docBranch;
    this.save();
    return docBranch;
  }
}

export type SafeUser = Omit<User & { passwordHash: string }, 'passwordHash'>;

export const db = new Database();
