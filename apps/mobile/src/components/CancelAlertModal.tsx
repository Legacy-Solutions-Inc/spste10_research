import { View, Text, TouchableOpacity, Modal } from "react-native";

interface CancelAlertModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CancelAlertModal({
  visible,
  onConfirm,
  onCancel,
}: CancelAlertModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Background overlay with 80% opacity white */}
      <View className="flex-1 bg-white/80 justify-center items-center px-4 py-2">
        {/* Modal box - centered with proper spacing, increased size */}
        <View className="bg-white rounded-2xl mx-2 my-2 w-full max-w-sm shadow-lg overflow-hidden min-h-[320px]">
          {/* Alert icon at the top - positioned to overlap modal top */}
          <View className="items-center mt-16 mb-4">
            <View 
              className="h-32 w-32 rounded-full bg-white border-[6px] border-gray-300 items-center justify-center relative"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {/* Inner dark blue circle */}
              <View className="h-24 w-24 rounded-full bg-[#0b376c] items-center justify-center relative">
                {/* Exclamation mark */}
                <Text className="text-7xl font-bold text-white leading-none">!</Text>
                
              </View>
            </View>
          </View>

          {/* Content area with proper padding - increased */}
          <View className="px-8 pb-8 pt-4">
            {/* Confirmation text - properly spaced and centered */}
            <Text className="text-xl font-bold text-blue-900 text-center leading-8 mb-6">
              Are you sure you want to cancel alert?
            </Text>
          </View>

          {/* Divider - clearer separation */}
          <View className="h-px bg-gray-200" />

          {/* Action buttons - larger with better spacing */}
          <View className="flex-row rounded-b-xl overflow-hidden">
            {/* YES button - 50% width, larger text, better padding */}
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center justify-center bg-white border-r border-gray-200"
            >
              <Text className="text-lg font-bold text-blue-900 tracking-wide">YES</Text>
            </TouchableOpacity>

            {/* NO button - 50% width, larger text, better padding */}
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center justify-center bg-white"
            >
              <Text className="text-lg font-bold text-blue-900 tracking-wide">NO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

