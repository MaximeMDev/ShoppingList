import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  User,
  CheckCheck,
  Layers,
  Sparkles,
  WifiOff
} from 'lucide-react';

const API_BASE_URL = 'https://shoppinglist-backend-qzny.onrender.com';

const CATEGORIES = [
  'Fruits & Légumes',
  'Boucherie & Poissonnerie',
  'Produits Frais & Crèmerie',
  'Épicerie & Féculents',
  'Boissons',
  'Surgelés',
  'Hygiène & Entretien',
  'Autre'
];

export default function App() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [userName, setUserName] = useState(() => localStorage.getItem('shopping_user') || 'Maxime');
  const [isConnected, setIsConnected] = useState(false);

  const stompClientRef = useRef(null);

  // Sauvegarde locale du prénom
  useEffect(() => {
    localStorage.setItem('shopping_user', userName);
  }, [userName]);

  // Chargement initial + Connexion WebSocket sécurisée
  useEffect(() => {
    // 1. Récupération initiale via REST
    fetch(`${API_BASE_URL}/api/items`)
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch((err) => console.error('Erreur chargement initial:', err));

    // 2. Initialisation STOMP
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-shopping`),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        client.subscribe('/topic/items', (message) => {
          setItems(JSON.parse(message.body));
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('Erreur STOMP:', frame);
        setIsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !isConnected || !stompClientRef.current) return;

    stompClientRef.current.publish({
      destination: '/app/add',
      body: JSON.stringify({
        name: newItemName.trim(),
        category: selectedCategory,
        addedBy: userName.trim() || 'Anonyme',
      }),
    });

    setNewItemName('');
  };

  const handleToggleItem = (id) => {
    if (!isConnected || !stompClientRef.current) return;
    stompClientRef.current.publish({
      destination: '/app/toggle',
      body: JSON.stringify(id),
    });
  };

  const handleDeleteItem = (id) => {
    if (!isConnected || !stompClientRef.current) return;
    stompClientRef.current.publish({
      destination: '/app/delete',
      body: JSON.stringify(id),
    });
  };

  const handleClearCompleted = () => {
    if (!isConnected || !stompClientRef.current) return;
    stompClientRef.current.publish({
      destination: '/app/clear-completed',
    });
  };

  // Séparation À prendre / Panier
  const pendingItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  // Regroupement par rayon
  const groupedPendingItems = CATEGORIES.reduce((acc, cat) => {
    const list = pendingItems.filter((i) => i.category === cat);
    if (list.length > 0) acc[cat] = list;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-28 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Bandeau d'état si le serveur charge ou est déconnecté */}
      {!isConnected && (
        <div className="bg-amber-500 text-white text-xs py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-1.5 shadow-inner">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          Connexion au serveur en cours... (Réveil du backend)
        </div>
      )}

      {/* En-tête Mobile Fixe */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Courses Famille</h1>
              <p className="text-[11px] font-medium text-slate-500">
                {pendingItems.length} à prendre • {completedItems.length} dans le panier
              </p>
            </div>
          </div>

          {/* Saisie Prénom Mobile */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-full border border-slate-200/80 text-xs">
            <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Prénom"
              className="bg-transparent w-16 outline-none text-slate-800 font-semibold text-xs"
            />
          </div>
        </div>
      </header>

      {/* Contenu Principal Mobile */}
      <main className="max-w-md mx-auto px-3.5 pt-3.5 space-y-4">

        {/* Formulaire d'Ajout Mobile */}
        <form onSubmit={handleAddItem} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Ajouter un article..."
              disabled={!isConnected}
              className="flex-1 px-3.5 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-base outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isConnected}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1 transition-all shadow-md shadow-indigo-100 shrink-0 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Saisie du rayon */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`snap-start px-3 py-1.5 text-xs rounded-xl font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </form>

        {/* Section 1 : Articles à prendre groupés par Rayon */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Articles à prendre ({pendingItems.length})
            </h2>
          </div>

          {Object.keys(groupedPendingItems).length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200/80">
              <Sparkles className="w-7 h-7 text-indigo-400 mx-auto mb-2 opacity-75" />
              <p className="text-sm font-semibold text-slate-600">Rien à acheter pour l'instant !</p>
              <p className="text-xs text-slate-400 mt-0.5">Ajoute des articles ci-dessus.</p>
            </div>
          ) : (
            Object.entries(groupedPendingItems).map(([category, catItems]) => (
              <div key={category} className="space-y-2">
                <div className="px-1 text-xs font-bold text-indigo-600 flex items-center gap-2">
                  <span>{category}</span>
                  <div className="flex-1 h-px bg-indigo-100"></div>
                </div>

                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs active:bg-slate-50 transition-all touch-manipulation"
                  >
                    <div
                      onClick={() => handleToggleItem(item.id)}
                      className="flex items-center gap-3 flex-1 cursor-pointer min-w-0 pr-2"
                    >
                      <Circle className="w-6 h-6 text-slate-300 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-800 truncate leading-snug">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ajouté par <span className="font-semibold text-slate-600">{item.addedBy}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2.5 -mr-1 text-slate-300 hover:text-rose-500 active:text-rose-600 rounded-xl transition-all shrink-0"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Section 2 : Dans le Panier */}
        {completedItems.length > 0 && (
          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dans le panier ({completedItems.length})
              </h2>

              <button
                onClick={handleClearCompleted}
                className="text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200/80 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 transition-all active:scale-95"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" /> Vider le panier
              </button>
            </div>

            <div className="space-y-2">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-200/50 opacity-75 transition-all"
                >
                  <div
                    onClick={() => handleToggleItem(item.id)}
                    className="flex items-center gap-3 flex-1 cursor-pointer min-w-0 pr-2"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-semibold line-through text-slate-400 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.category} • Par {item.addedBy}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}