import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Inicialização preguiçosa para evitar erro de re-hidratação e leitura desnecessária
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // Tenta fazer o parse. Se for data, precisamos de uma reviver function?
        // Como o JSON normal perde objetos Date, vamos lidar com a conversão de datas nos tipos específicos,
        // mas aqui parseamos o JSON cru.
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permite que o valor seja uma função, semelhante à API do useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Erro ao definir localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
