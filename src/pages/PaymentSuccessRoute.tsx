import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import StripeSuccessPage from '../components/StripeSuccessPage';

const PaymentSuccessRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const handleBack = () => {
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Payment Successful | EquityTake</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <StripeSuccessPage
        onBack={handleBack}
        sessionId={sessionId}
      />
    </>
  );
};

export default PaymentSuccessRoute;
