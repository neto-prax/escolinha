import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function PainelVendedor() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const isDirector = roles.includes('director') || roles.length === 0;

  useEffect(() => {
    if (!isDirector) {
      navigate('/app/dashboard', { replace: true });
    } else {
      navigate('/app/perfil?tab=comissao', { replace: true });
    }
  }, [isDirector, navigate]);

  return null;
}
