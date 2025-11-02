import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  productId: string
  slug: string
  name: string
  price: number
  quantity: number
  image: string
  catalogObjectId?: string  // Square catalog object ID
  category?: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  subtotal: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => {
        const existingItem = state.items.find(i => i.productId === item.productId)
        
        if (existingItem) {
          // Update quantity if item already exists
          return {
            items: state.items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          }
        } else {
          // Add new item
          return {
            items: [...state.items, item]
          }
        }
      }),
      
      removeItem: (productId) => set((state) => ({
        items: state.items.filter(i => i.productId !== productId)
      })),
      
      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter(i => i.productId !== productId) }
        }
        return {
          items: state.items.map(i =>
            i.productId === productId
              ? { ...i, quantity }
              : i
          )
        }
      }),
      
      clearCart: () => set({ items: [] }),
      
      totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      
      subtotal: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0),
    }),
    {
      name: 'tog_cart_v3',
      version: 3,
      storage: createJSONStorage(() => {
        // Only use localStorage in browser
        if (typeof window !== 'undefined') {
          return localStorage
        }
        // Fallback for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
    }
  )
)
