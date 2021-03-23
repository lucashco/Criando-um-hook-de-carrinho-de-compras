import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const stockData = stockResponse.data;

      const product = cart.find(productCart => productCart.id === productId);

      if(product) {
        if(stockData.amount >= product.amount + 1) {   
          return updateProductAmount({
            productId,
            amount: (product.amount + 1)
          });       
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
        return;
      }

      const productResponse = await api.get<Product>(`/products/${productId}`);
      const productData = productResponse.data;      

      const newProduct =  {...productData, amount:1 };
        setCart(state => {
        const updatedCart = [...state, newProduct ]
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        return updatedCart;
      });


    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(productCart => productCart.id === productId);

      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(productCart => productId !== productCart.id);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        return;
      }

      const response = await api.get<Stock>(`stock/${productId}`);
      const stock = response.data;

      if(stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(productCart => {
        if (productCart.id === productId) {
          return {
            ...productCart,
            amount,
          }
        }
        return productCart;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
