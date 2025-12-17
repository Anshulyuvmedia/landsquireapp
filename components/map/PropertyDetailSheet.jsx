// components/map/PropertyDetailSheet.jsx
import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { MapCard } from '@/components/Cards';

const PropertyDetailSheet = ({ sheetRef, selectedItem, viewItem }) => {
    if (!selectedItem) return null;

    const cardItem = {
        ...selectedItem,
        property_name: selectedItem.property_name || selectedItem.projecttitle || 'Property',
        description: selectedItem.description || selectedItem.discription || '',
    };

    return (
        <RBSheet
            ref={sheetRef}
            closeOnDragDown={true}
            closeOnPressMask={true}
            height={Dimensions.get('window').height * 0.35}
            customStyles={{
                wrapper: {
                    backgroundColor: 'rgba(0,0,0,0.5)',
                },
                container: {
                    borderTopLeftRadius: 35,
                    borderTopRightRadius: 35,
                    padding: 20,
                    backgroundColor: 'white',
                },
                draggableIcon: {
                    backgroundColor: '#000',
                    width: 40,
                    height: 5,
                    marginVertical: 10,
                },
            }}
        >
            <View style={styles.content}>
                <MapCard
                    item={cardItem}
                    map="true"
                    onPress={() => {
                        sheetRef.current?.close();
                        viewItem(selectedItem);
                    }}
                />
            </View>
        </RBSheet>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
});

export default PropertyDetailSheet;