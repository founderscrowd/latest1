import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import StripeCancelPage from '../components/StripeCancelPage';

interface PaymentCancelRouteProps {
  onShowPricingModal: () => void;
}

const PaymentCancelRoute: React.FC<PaymentCancelRouteProps> = ({ onShowPricingModal }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = () => {
    navigate('/');
    onShowPricingModal();
  };

  return (
    <>
      <Helmet>
        <title>Payment Cancelled | EquityTake</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <StripeCancelPage
        onBack={handleBack}
        onRetry={handleRetry}
      />
    </>
  );
};

export default PaymentCancelRoute;
