type OfflineAction = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  type: string;
};

export const offlineStore = {
  saveAction: (url: string, method: string, headers: Record<string, string>, body: any, type: string) => {
    const actions: OfflineAction[] = JSON.parse(localStorage.getItem('offline_actions') || '[]');
    actions.push({
      id: Math.random().toString(36).substring(7),
      url,
      method,
      headers,
      body,
      type
    });
    localStorage.setItem('offline_actions', JSON.stringify(actions));
  },
  
  getRecords: () => {
    return JSON.parse(localStorage.getItem('offline_actions') || '[]');
  },
  
  removeAction: (id: string) => {
    const actions: OfflineAction[] = JSON.parse(localStorage.getItem('offline_actions') || '[]');
    localStorage.setItem('offline_actions', JSON.stringify(actions.filter(a => a.id !== id)));
  },

  syncRecords: async () => {
    const actions: OfflineAction[] = offlineStore.getRecords();
    if (actions.length === 0) return true;
    
    let allSynced = true;
    
    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: JSON.stringify(action.body)
        });
        
        if (response.ok) {
          offlineStore.removeAction(action.id);
        } else {
          allSynced = false;
        }
      } catch (e) {
        console.error(`Offline sync failed for action ${action.type}`, e);
        allSynced = false;
        break; // Stop syncing if network is still down
      }
    }
    return allSynced;
  }
};
