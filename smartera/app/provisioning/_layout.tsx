import React from 'react';
import { Slot } from 'expo-router';
import { ProvisioningProvider } from '../../context/ProvisioningContext';
import '../../services/i18n';

export default function ProvisioningLayout() {
  return (
    <ProvisioningProvider><Slot />
    </ProvisioningProvider>
  );
}