import React from 'react';
import { Modal, ModalProps } from 'react-native';
import { ThemedModal } from '@/components/themed';

interface ModalWrapperProps extends ModalProps {
  // Additional props for theming
  themed?: boolean;
  themeSize?: 'small' | 'medium' | 'large' | 'fullscreen';
  themeSlideFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  themeAnimationType?: 'slide' | 'fade' | 'none';
}

/**
 * ModalWrapper - Non-invasive modal theming wrapper
 * 
 * This component wraps React Native's Modal with ThemedModal styling
 * while preserving all existing functionality and props.
 * 
 * Usage:
 * Simply replace <Modal> with <ModalWrapper> and add themed={true}
 * 
 * Example:
 * <ModalWrapper
 *   visible={showModal}
 *   onRequestClose={() => setShowModal(false)}
 *   themed={true}
 *   themeSize="medium"
 * >
 *   <YourExistingModalContent />
 * </ModalWrapper>
 */
export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  themed = false,
  themeSize = 'medium',
  themeSlideFrom = 'bottom',
  themeAnimationType = 'slide',
  children,
  ...modalProps
}) => {
  // If not themed, use original Modal
  if (!themed) {
    return (
      <Modal {...modalProps}>
        {children}
      </Modal>
    );
  }

  // If themed, use ThemedModal
  return (
    <ThemedModal
      visible={modalProps.visible || false}
      onClose={() => {
        if (modalProps.onRequestClose) {
          modalProps.onRequestClose();
        }
      }}
      size={themeSize}
      slideFrom={themeSlideFrom}
      animationType={themeAnimationType}
      transparent={modalProps.transparent}
      presentationStyle={modalProps.presentationStyle}
      dismissible={modalProps.onRequestClose ? true : false}
    >
      {children}
    </ThemedModal>
  );
};

export default ModalWrapper;
