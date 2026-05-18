/**
 * Componente de Split View para Editor e Preview
 * Permite visualizar código e preview lado a lado
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface SplitViewProps {
    leftComponent: React.ReactNode;
    rightComponent: React.ReactNode;
    defaultSplitRatio?: number; // 0.0 a 1.0
    minLeftWidth?: number;
    minRightWidth?: number;
    orientation?: 'horizontal' | 'vertical';
    showToggle?: boolean;
    isPreviewVisible?: boolean;
    onTogglePreview?: () => void;
}

export function SplitView({
    leftComponent,
    rightComponent,
    defaultSplitRatio = 0.5,
    minLeftWidth = 200,
    minRightWidth = 200,
    orientation = 'horizontal',
    showToggle = true,
    isPreviewVisible: propsIsPreviewVisible,
    onTogglePreview,
}: SplitViewProps) {
    const colors = useColors();
    const [splitRatio] = useState(defaultSplitRatio);
    const [internalIsPreviewVisible, setInternalIsPreviewVisible] = useState(true);

    const isPreviewVisible = propsIsPreviewVisible !== undefined ? propsIsPreviewVisible : internalIsPreviewVisible;
    const togglePreview = onTogglePreview || (() => setInternalIsPreviewVisible((visible) => !visible));

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    const isHorizontal = orientation === 'horizontal';
    const totalSize = isHorizontal ? screenWidth : screenHeight;

    const leftSize = isPreviewVisible ? totalSize * splitRatio : totalSize;
    const rightSize = isPreviewVisible ? totalSize * (1 - splitRatio) : 0;



    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    flex: 1,
                    flexDirection: isHorizontal ? 'row' : 'column',
                    backgroundColor: colors.background,
                },
                leftPanel: {
                    width: isHorizontal ? leftSize : undefined,
                    height: isHorizontal ? undefined : leftSize,
                    backgroundColor: colors.background,
                },
                rightPanel: {
                    width: isHorizontal ? rightSize : undefined,
                    height: isHorizontal ? undefined : rightSize,
                    backgroundColor: colors.surface,
                    borderLeftWidth: isHorizontal ? 1 : 0,
                    borderTopWidth: isHorizontal ? 0 : 1,
                    borderColor: colors.border,
                },
                divider: {
                    width: isHorizontal ? 4 : undefined,
                    height: isHorizontal ? undefined : 4,
                    backgroundColor: colors.border,
                },
                toggleButton: {
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 4,
                    zIndex: 1000,
                },
                toggleButtonText: {
                    color: colors.background,
                    fontSize: 12,
                    fontWeight: 'bold',
                },
            }),
        [
            colors.background,
            colors.border,
            colors.primary,
            colors.surface,
            isHorizontal,
            leftSize,
            rightSize,
        ],
    );

    return (
        <View style={styles.container}>
            {showToggle && (
                <TouchableOpacity style={styles.toggleButton} onPress={togglePreview}>
                    <Text style={styles.toggleButtonText}>
                        {isPreviewVisible ? 'Ocultar Preview' : 'Mostrar Preview'}
                    </Text>
                </TouchableOpacity>
            )}

            <View style={styles.leftPanel}>
                {leftComponent}
            </View>

            {isPreviewVisible && (
                <>
                    <View style={styles.divider} />
                    <View style={styles.rightPanel}>
                        {rightComponent}
                    </View>
                </>
            )}
        </View>
    );
}

/**
 * Hook para gerenciar estado de split view
 */
export function useSplitView(initialRatio: number = 0.5) {
    const [splitRatio, setSplitRatio] = useState(initialRatio);
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);

    const togglePreview = () => {
        setIsPreviewVisible((visible) => !visible);
    };

    const setSplit = (ratio: number) => {
        setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    return {
        splitRatio,
        isPreviewVisible,
        togglePreview,
        setSplit,
    };
}

/**
 * Componente de Split View Responsivo
 * Automaticamente muda para vertical em telas pequenas
 */
export function ResponsiveSplitView({
    leftComponent,
    rightComponent,
    breakpoint = 768,
    ...props
}: SplitViewProps & { breakpoint?: number }) {
    const screenWidth = Dimensions.get('window').width;
    const orientation = screenWidth < breakpoint ? 'vertical' : 'horizontal';

    return (
        <SplitView
            {...props}
            leftComponent={leftComponent}
            rightComponent={rightComponent}
            orientation={orientation}
        />
    );
}

/**
 * Preset para Editor + Preview
 */
export function EditorPreviewSplit({
    editor,
    preview,
    language,
    isPreviewVisible,
    onTogglePreview,
}: {
    editor: React.ReactNode;
    preview: React.ReactNode;
    language: string;
    isPreviewVisible?: boolean;
    onTogglePreview?: () => void;
}) {
    const showPreview = language === 'html' || language === 'css';

    if (!showPreview) {
        return <>{editor}</>;
    }

    return (
        <ResponsiveSplitView
            leftComponent={editor}
            rightComponent={preview}
            defaultSplitRatio={0.6}
            minLeftWidth={300}
            minRightWidth={200}
            showToggle={true}
            isPreviewVisible={isPreviewVisible}
            onTogglePreview={onTogglePreview}
        />
    );
}
