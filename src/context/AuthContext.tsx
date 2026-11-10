import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, provisionAuth } from '../firebase/config';
import { UsuarioSistema } from '../types';

interface AuthContextType {
  user: User | null;
  usuarioSistema: UsuarioSistema | null;
  isAdmin: boolean;
  isLoading: boolean;
  usuariosSistema: UsuarioSistema[];
  loginComGoogle: () => Promise<{ success: boolean; message?: string }>;
  loginComCredenciais: (email: string, senha: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  cadastrarUsuarioSistema: (novo: Omit<UsuarioSistema, 'id' | 'createdAt'>) => Promise<{ success: boolean; message?: string }>;
  atualizarUsuarioSistema: (id: string, dados: Partial<UsuarioSistema>) => Promise<{ success: boolean; message?: string }>;
  excluirUsuarioSistema: (id: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const MASTER_EMAIL = 'administrativo@gmail.com';
const MASTER_PROFILE_ID = 'master';

function profileFromData(uid: string, data: Record<string, unknown>): UsuarioSistema {
  return { ...data, id: uid, uid } as UsuarioSistema;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(null);
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioSistema[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = useMemo(() =>
    user?.email?.toLowerCase() === MASTER_EMAIL && usuarioSistema?.role === 'admin',
  [user, usuarioSistema]);

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    setUser(firebaseUser);
    setUsuarioSistema(null);
    if (!firebaseUser) {
      setIsLoading(false);
      return;
    }
    try {
      const email = (firebaseUser.email || '').toLowerCase();
      if (email === MASTER_EMAIL) {
        if (!firebaseUser.emailVerified) {
          await sendEmailVerification(firebaseUser).catch(() => undefined);
          await signOut(auth);
          setUser(null);
          setUsuarioSistema(null);
          return;
        }
        setUsuarioSistema({
          id: firebaseUser.uid, uid: firebaseUser.uid, lojaId: MASTER_PROFILE_ID,
          nome: firebaseUser.displayName || 'Administrador Master', nomeLoja: 'Gradi Gestão',
          email: MASTER_EMAIL, role: 'admin', status: 'ativo',
          createdAt: new Date().toISOString(), criadoPor: 'Sistema',
        });
      } else {
        const profileSnap = await getDoc(doc(db, 'systemUsers', firebaseUser.uid));
        if (!profileSnap.exists()) {
          await signOut(auth);
          setUser(null);
          setUsuarioSistema(null);
          return;
        }
        const profile = profileFromData(firebaseUser.uid, profileSnap.data() as Record<string, unknown>);
        if (profile.status !== 'ativo' || !profile.lojaId) {
          await signOut(auth);
          setUser(null);
          setUsuarioSistema(null);
          return;
        }
        setUsuarioSistema(profile);
        await updateDoc(doc(db, 'systemUsers', firebaseUser.uid), { ultimoAcesso: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Falha ao carregar perfil do usuário:', error);
      await signOut(auth).catch(() => undefined);
      setUser(null);
      setUsuarioSistema(null);
    } finally {
      setIsLoading(false);
    }
  }), []);

  useEffect(() => {
    if (!user || user.email?.toLowerCase() !== MASTER_EMAIL) {
      setUsuariosSistema([]);
      return;
    }
    return onSnapshot(query(collection(db, 'systemUsers')), (snapshot) => {
      setUsuariosSistema(snapshot.docs.map((item) => profileFromData(item.id, item.data() as Record<string, unknown>)));
    }, (error) => console.error('Erro ao carregar usuários:', error));
  }, [user]);

  const loginComGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Não foi possível entrar com Google.' };
    } finally { setIsLoading(false); }
  };

  const loginComCredenciais = async (email: string, senha: string) => {
    try {
      setIsLoading(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
      if (credential.user.email?.toLowerCase() === MASTER_EMAIL && !credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await signOut(auth);
        return { success: false, message: 'Enviamos um link de verificação para seu e-mail. Confirme o endereço e tente entrar novamente.' };
      }
      return { success: true };
    } catch (error) {
      const code = (error as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'E-mail ou senha incorretos.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
        'auth/unauthorized-domain': 'Este domínio ainda não está autorizado no Firebase Authentication.',
      };
      return { success: false, message: messages[code || ''] || (error instanceof Error ? error.message : 'Falha ao entrar.') };
    } finally { setIsLoading(false); }
  };

  const logout = async () => { await signOut(auth); setUsuarioSistema(null); setUser(null); };

  const cadastrarUsuarioSistema = async (novo: Omit<UsuarioSistema, 'id' | 'createdAt'>) => {
    if (!isAdmin) return { success: false, message: 'Somente o Administrador Master pode cadastrar usuários.' };
    const email = novo.email.trim().toLowerCase();
    if (!email || !novo.senha || novo.senha.length < 6) return { success: false, message: 'Informe e-mail e senha com pelo menos 6 caracteres.' };
    let createdUser: User | null = null;
    try {
      const credential = await createUserWithEmailAndPassword(provisionAuth, email, novo.senha);
      createdUser = credential.user;
      const lojaId = novo.lojaId || `loja-${Date.now()}`;
      const profile: UsuarioSistema = {
        ...novo, id: createdUser.uid, uid: createdUser.uid, lojaId,
        email, createdAt: new Date().toISOString(), criadoPor: MASTER_EMAIL,
      };
      const { senha: _senha, ...safeProfile } = profile;
      await setDoc(doc(db, 'stores', lojaId), {
        nome: novo.nomeLoja,
        status: 'ativo',
        createdAt: new Date().toISOString(),
        criadoPor: MASTER_EMAIL,
      }, { merge: true });
      await setDoc(doc(db, 'systemUsers', createdUser.uid), safeProfile);
      await signOut(provisionAuth);
      return { success: true };
    } catch (error) {
      if (createdUser) await createdUser.delete().catch(() => undefined);
      await signOut(provisionAuth).catch(() => undefined);
      return { success: false, message: error instanceof Error ? error.message : 'Não foi possível cadastrar o usuário.' };
    }
  };

  const atualizarUsuarioSistema = async (id: string, dados: Partial<UsuarioSistema>) => {
    if (!isAdmin) return { success: false, message: 'Apenas o Administrador Master pode alterar usuários.' };
    if (id === user?.uid && (dados.role && dados.role !== 'admin')) return { success: false, message: 'Não é possível remover sua própria permissão master.' };
    try {
      const { senha: _senha, ...safeData } = dados;
      await setDoc(doc(db, 'systemUsers', id), safeData, { merge: true });
      return { success: true };
    } catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Erro ao atualizar usuário.' }; }
  };

  const excluirUsuarioSistema = async (id: string) => {
    if (!isAdmin) return { success: false, message: 'Apenas o Administrador Master pode excluir usuários.' };
    if (id === user?.uid || usuariosSistema.find((item) => item.id === id)?.email.toLowerCase() === MASTER_EMAIL) {
      return { success: false, message: 'Não é permitido excluir o Administrador Master.' };
    }
    try {
      await deleteDoc(doc(db, 'systemUsers', id));
      return { success: true, message: 'Perfil removido. A conta de autenticação deverá ser desativada pelo administrador do Firebase.' };
    } catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Erro ao excluir usuário.' }; }
  };

  return <AuthContext.Provider value={{ user, usuarioSistema, isAdmin, isLoading, usuariosSistema, loginComGoogle, loginComCredenciais, logout, cadastrarUsuarioSistema, atualizarUsuarioSistema, excluirUsuarioSistema }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
