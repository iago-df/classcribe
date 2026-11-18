import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, PanResponder, Pressable, StyleSheet, TextInput, View, type GestureResponderEvent } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { folderTree, uid, useStore } from '../store';
import { useT } from '../i18n';
import { colors, fonts } from '../theme';
import { keepSyllabusFile, removeFile } from '../lib/files';
import { confirm } from '../lib/confirm';
import type { Folder, SyllabusFile } from '../types';
import { ChevronIcon, CloseIcon, FileIcon, FolderIcon, PencilIcon, PlusIcon, ShareIcon, StarIcon, TrashIcon, UpIcon } from './icons';
import { Sheet } from './Sheet';
import { Button, Empty, Kicker, T } from './ui';

const PARENT = '__parent__';
const fileKey = (id: string) => `f:${id}`;
const folderKey = (id: string) => `d:${id}`;
type Rect = { x: number; y: number; w: number; h: number };
// what measureInWindow needs from a mounted view
type Host = {
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

/**
 * state for the syllabus of one subject: current folder, selection, drag and drop and the sheets.
 * The list lives inside the scroll view, the + button and the action bar float over the screen,
 * so the screen renders the three pieces with the same controller.
 */
export function useSyllabus(subjectId: string, active: boolean) {
  const { t } = useT();
  const allFiles = useStore((s) => s.files);
  const allFolders = useStore((s) => s.folders);
  const files = allFiles.filter((f) => f.subjectId === subjectId);
  const folders = allFolders.filter((f) => f.subjectId === subjectId);
  const { addFile, updateFile, addFolder, renameFolder, removeItems, moveItems } = useStore.getState();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [naming, setNaming] = useState<{
    mode: 'new' | 'rename';
    value: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const selecting = selected.size > 0;
  const here = {
    folders: folders.filter((f) => f.parentId === folderId).sort((a, b) => a.name.localeCompare(b.name)),
    files: files.filter((f) => (f.parentId ?? null) === folderId).sort((a, b) => a.createdAt - b.createdAt),
  };
  const current = folders.find((f) => f.id === folderId) ?? null;
  const path: Folder[] = [];
  for (let f = current; f; f = folders.find((x) => x.id === f!.parentId) ?? null) path.unshift(f);

  const selFiles = files.filter((f) => selected.has(fileKey(f.id)));
  const selFolders = folders.filter((f) => selected.has(folderKey(f.id)));

  // android back: first leave selection, then go up a folder
  useEffect(() => {
    if (!active || (!selecting && !folderId)) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selecting) setSelected(new Set());
      else setFolderId(current?.parentId ?? null);
      return true;
    });
    return () => sub.remove();
  }, [active, selecting, folderId, current?.parentId]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ---------- drag and drop ----------
  const pos = useRef(new Animated.ValueXY()).current;
  const origin = useRef({ x: 0, y: 0 });
  const container = useRef<Host | null>(null);
  const targets = useRef(new Map<string, Host | null>());
  const rects = useRef(new Map<string, Rect>());
  const drag = useRef({
    on: false,
    granted: false,
    hover: null as string | null,
  });

  const measure = (view: Host | null | undefined): Promise<Rect | null> =>
    new Promise((resolve) => (view ? view.measureInWindow((x, y, w, h) => resolve({ x, y, w, h })) : resolve(null)));

  const hitTest = (x: number, y: number) => {
    for (const [k, r] of rects.current) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return k;
    return null;
  };

  const endDrag = () => {
    drag.current = { on: false, granted: false, hover: null };
    setDragging(false);
    setHover(null);
  };

  const drop = (target: string | null) => {
    const dest = target === PARENT ? (current?.parentId ?? null) : target;
    if (target !== null) {
      moveItems(
        selFiles.map((f) => f.id),
        selFolders.map((f) => f.id),
        dest,
      );
      setSelected(new Set());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    endDrag();
  };

  async function startDrag(e: GestureResponderEvent) {
    const { pageX, pageY } = e.nativeEvent;
    drag.current = { on: true, granted: false, hover: null };
    setDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const box = await measure(container.current);
    origin.current = box ? { x: box.x, y: box.y } : { x: 0, y: 0 };
    pos.setValue({ x: pageX - origin.current.x, y: pageY - origin.current.y });
    rects.current.clear();
    for (const [k, v] of targets.current) {
      if (k !== PARENT && selected.has(folderKey(k))) continue; // can't drop a folder into itself
      const r = await measure(v);
      if (r) rects.current.set(k, r);
    }
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => drag.current.on,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => (drag.current.granted = true),
      onPanResponderMove: (_, g) => {
        pos.setValue({
          x: g.moveX - origin.current.x,
          y: g.moveY - origin.current.y,
        });
        const h = hitTest(g.moveX, g.moveY);
        if (h !== drag.current.hover) {
          drag.current.hover = h;
          setHover(h);
          if (h) Haptics.selectionAsync().catch(() => {});
        }
      },
      onPanResponderRelease: (_, g) => dropRef.current(hitTest(g.moveX, g.moveY)),
      onPanResponderTerminate: () => endDrag(),
    }),
  ).current;
  // the responder is created once; always drop with the latest selection
  const dropRef = useRef(drop);
  dropRef.current = drop;

  // a long press that never moves ends where it started
  const pressOut = () =>
    setTimeout(() => {
      if (drag.current.on && !drag.current.granted) endDrag();
    }, 60);

  // ---------- actions ----------
  async function upload() {
    setAdding(false);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'text/plain', 'text/markdown'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      const fid = uid();
      const uri = await keepSyllabusFile(a.uri, fid, a.name);
      addFile({
        id: fid,
        subjectId,
        name: a.name.replace(/\.[^.]+$/, ''),
        uri,
        mimeType: a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        size: a.size ?? 0,
        current: false,
        createdAt: Date.now(),
        parentId: folderId,
      });
    }
  }

  function saveName() {
    const v = naming?.value.trim();
    if (!naming || !v) return;
    if (naming.mode === 'new') addFolder(subjectId, folderId, v);
    else if (selFolders[0]) renameFolder(selFolders[0].id, v);
    else if (selFiles[0]) updateFile(selFiles[0].id, { name: v });
    setNaming(null);
    setSelected(new Set());
  }

  function remove() {
    const n = selected.size;
    confirm(n === 1 ? t('syllabus.deleteTitle1') : t('syllabus.deleteTitle', { n }), t('syllabus.deleteMsg'), () => {
      const gone = folderTree(
        folders,
        selFolders.map((f) => f.id),
      );
      files.filter((f) => selected.has(fileKey(f.id)) || (f.parentId && gone.has(f.parentId))).forEach((f) => removeFile(f.uri));
      removeItems(
        selFiles.map((f) => f.id),
        selFolders.map((f) => f.id),
      );
      setSelected(new Set());
    });
  }

  async function share() {
    const f = selFiles[0];
    if (!f || !(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(f.uri, {
      mimeType: f.mimeType,
      dialogTitle: f.name,
    });
  }

  function markCurrent() {
    const on = !selFiles.every((f) => f.current);
    selFiles.forEach((f) => updateFile(f.id, { current: on }));
    setSelected(new Set());
  }

  return {
    files,
    folders,
    here,
    path,
    current,
    folderId,
    setFolderId,
    selected,
    selecting,
    selFiles,
    selFolders,
    toggle,
    clear: () => setSelected(new Set()),
    adding,
    setAdding,
    naming,
    setNaming,
    dragging,
    hover,
    pos,
    pan,
    container,
    targets,
    startDrag,
    pressOut,
    upload,
    saveName,
    remove,
    share,
    markCurrent,
    countIn: (id: string) => folders.filter((f) => f.parentId === id).length + files.filter((f) => f.parentId === id).length,
  };
}

export type SyllabusCtrl = ReturnType<typeof useSyllabus>;

/** the list: breadcrumb or selection header, folders, files and the floating drag chip */
export function SyllabusList({ c }: { c: SyllabusCtrl }) {
  const { t } = useT();
  const empty = c.here.folders.length === 0 && c.here.files.length === 0;

  const onItemLongPress = (key: string, e: GestureResponderEvent) => {
    if (!c.selecting) {
      c.toggle(key);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    if (!c.selected.has(key)) c.toggle(key);
    c.startDrag(e);
  };

  return (
    <View ref={c.container as never} {...c.pan.panHandlers} style={{ minHeight: 320 }}>
      {c.selecting ? (
        <View style={st.selHead}>
          <Pressable onPress={c.clear} hitSlop={10} style={st.roundBtn}>
            <CloseIcon size={16} />
          </Pressable>
          <T weight="semibold" style={{ fontSize: 16 }}>
            {t('syllabus.selected', { n: c.selected.size })}
          </T>
        </View>
      ) : (
        <View style={st.crumbs}>
          {[null, ...c.path].map((f, i) => {
            const last = i === c.path.length;
            return (
              <View key={f?.id ?? 'root'} style={st.crumbItem}>
                {i > 0 && <ChevronIcon size={14} />}
                <Pressable disabled={last} onPress={() => c.setFolderId(f?.id ?? null)} hitSlop={6}>
                  <T
                    weight={last ? 'semibold' : 'regular'}
                    numberOfLines={1}
                    style={{
                      fontSize: 14,
                      color: last ? colors.ink : colors.mute,
                    }}
                  >
                    {f?.name ?? t('syllabus.root')}
                  </T>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {empty &&
        (c.folderId ? (
          <T style={st.emptyFolder}>{t('syllabus.emptyFolder')}</T>
        ) : (
          <Empty title={t('subjects.tabSyllabus')} hint={t('subjects.noSyllabus')}>
            <Button label={t('syllabus.add')} onPress={() => c.setAdding(true)} style={{ alignSelf: 'stretch', marginTop: 12 }} />
          </Empty>
        ))}

      {c.here.folders.map((f) => {
        const key = folderKey(f.id);
        const on = c.selected.has(key);
        const n = c.countIn(f.id);
        return (
          <Pressable
            key={f.id}
            ref={(v) => {
              c.targets.current.set(f.id, v as unknown as Host | null);
            }}
            onPress={() => (c.selecting ? c.toggle(key) : c.setFolderId(f.id))}
            onLongPress={(e) => onItemLongPress(key, e)}
            onPressOut={c.pressOut}
            delayLongPress={300}
            style={[st.row, c.hover === f.id && st.rowHover, c.dragging && on && st.rowDragged]}
          >
            <View style={[st.ico, st.icoFolder]}>
              <FolderIcon size={24} filled={c.hover === f.id} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="medium" numberOfLines={1} style={st.name}>
                {f.name}
              </T>
              <T style={st.meta}>{n === 1 ? t('syllabus.item1') : t('syllabus.items', { n })}</T>
            </View>
            {c.selecting ? <Check on={on} /> : <ChevronIcon />}
          </Pressable>
        );
      })}

      {c.here.files.map((f) => {
        const key = fileKey(f.id);
        const on = c.selected.has(key);
        return <FileRow key={f.id} f={f} on={on} c={c} onLongPress={(e) => onItemLongPress(key, e)} />;
      })}

      {!empty && !c.selecting && <Kicker style={st.hint}>{t('syllabus.hint')}</Kicker>}

      {/* drop target to take things out of this folder */}
      {c.dragging && c.folderId && (
        <View
          ref={(v) => {
            c.targets.current.set(PARENT, v as unknown as Host | null);
          }}
          style={[st.parent, c.hover === PARENT && st.parentHover]}
        >
          <UpIcon color={c.hover === PARENT ? colors.white : colors.ink} />
          <T
            weight="medium"
            numberOfLines={1}
            style={{
              fontSize: 14,
              color: c.hover === PARENT ? colors.white : colors.ink,
            }}
          >
            {t('syllabus.dropOut', {
              name: c.path.length > 1 ? c.path[c.path.length - 2].name : t('syllabus.root'),
            })}
          </T>
        </View>
      )}

      {c.dragging && (
        <Animated.View pointerEvents="none" style={[st.chip, { transform: [{ translateX: c.pos.x }, { translateY: c.pos.y }] }]}>
          <T weight="semibold" style={{ color: colors.white, fontSize: 14 }}>
            {t('syllabus.moving', { n: c.selected.size })}
          </T>
        </Animated.View>
      )}
    </View>
  );
}

function FileRow({
  f,
  on,
  c,
  onLongPress,
}: {
  f: SyllabusFile;
  on: boolean;
  c: SyllabusCtrl;
  onLongPress: (e: GestureResponderEvent) => void;
}) {
  const { t } = useT();
  const pdf = f.mimeType === 'application/pdf';
  const img = f.mimeType.startsWith('image/');
  return (
    <Pressable
      onPress={() => (c.selecting ? c.toggle(fileKey(f.id)) : router.push(`/file/${f.id}`))}
      onLongPress={onLongPress}
      onPressOut={c.pressOut}
      delayLongPress={300}
      style={[st.row, c.dragging && on && st.rowDragged]}
    >
      <View style={[st.ico, f.current && st.icoDark]}>
        <FileIcon size={20} color={f.current ? '#bbbbbb' : '#8b8b88'} />
        <T
          mono
          style={{
            fontSize: 9,
            color: f.current ? '#bbb' : '#666',
            marginTop: 2,
          }}
        >
          {pdf ? 'PDF' : img ? 'IMG' : 'TXT'}
        </T>
      </View>
      <View style={{ flex: 1 }}>
        <T weight="medium" numberOfLines={1} style={st.name}>
          {f.name}
        </T>
        <T style={st.meta}>{img ? t('subjects.images') : `${Math.max(1, Math.round(f.size / 1024))} KB`}</T>
      </View>
      {c.selecting ? (
        <Check on={on} />
      ) : (
        f.current && (
          <View style={st.badge}>
            <T mono style={{ fontSize: 10, letterSpacing: 0.6, color: colors.white }}>
              {t('subjects.current')}
            </T>
          </View>
        )
      )}
    </Pressable>
  );
}

const Check = ({ on }: { on: boolean }) => <View style={[st.check, on && st.checkOn]}>{on && <View style={st.checkMark} />}</View>;

/** the floating + and the gallery-like action bar, drawn over the screen */
export function SyllabusOverlay({ c, visible }: { c: SyllabusCtrl; visible: boolean }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const n = c.selected.size;
  const oneFile = c.selFiles.length === 1 && c.selFolders.length === 0;
  const allCurrent = c.selFiles.length > 0 && c.selFiles.every((f) => f.current);
  const bottom = insets.bottom + 18;

  return (
    <>
      {!c.selecting && (
        <Pressable accessibilityLabel={t('syllabus.add')} onPress={() => c.setAdding(true)} style={[st.fab, { bottom: bottom + 6 }]}>
          <PlusIcon size={26} color={colors.white} />
        </Pressable>
      )}

      {c.selecting && !c.dragging && (
        <View style={[st.bar, { bottom }]}>
          <BarBtn label={t('syllabus.share')} disabled={!oneFile} onPress={c.share} icon={<ShareIcon />} />
          <BarBtn
            label={t('syllabus.rename')}
            disabled={n !== 1}
            onPress={() =>
              c.setNaming({
                mode: 'rename',
                value: c.selFolders[0]?.name ?? c.selFiles[0]?.name ?? '',
              })
            }
            icon={<PencilIcon />}
          />
          <BarBtn
            label={t('syllabus.current')}
            disabled={c.selFiles.length === 0}
            onPress={c.markCurrent}
            icon={<StarIcon filled={allCurrent} />}
          />
          <BarBtn label={t('syllabus.delete')} onPress={c.remove} icon={<TrashIcon />} />
        </View>
      )}

      <Sheet visible={c.adding} onClose={() => c.setAdding(false)}>
        <T weight="semibold" style={st.sheetTitle}>
          {t('syllabus.add')}
        </T>
        <AddRow icon={<FileIcon />} title={t('syllabus.upload')} hint={t('syllabus.uploadHint')} onPress={c.upload} />
        <AddRow
          icon={<FolderIcon />}
          title={t('syllabus.newFolder')}
          hint={t('syllabus.newFolderHint')}
          onPress={() => {
            c.setAdding(false);
            c.setNaming({ mode: 'new', value: '' });
          }}
        />
      </Sheet>

      <Sheet visible={!!c.naming} onClose={() => c.setNaming(null)}>
        <T weight="semibold" style={st.sheetTitle}>
          {c.naming?.mode === 'new' ? t('syllabus.newFolder') : t('syllabus.rename')}
        </T>
        <TextInput
          value={c.naming?.value ?? ''}
          onChangeText={(value) => c.setNaming((p) => (p ? { ...p, value } : p))}
          onSubmitEditing={c.saveName}
          autoFocus
          placeholder={t('syllabus.folderName')}
          placeholderTextColor={colors.faint}
          style={st.input}
        />
        <Button label={t('common.save')} onPress={c.saveName} disabled={!c.naming?.value.trim()} style={{ marginTop: 14 }} />
      </Sheet>
    </>
  );
}

function BarBtn({ label, icon, onPress, disabled }: { label: string; icon: React.ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[st.barBtn, disabled && { opacity: 0.3 }]}>
      {icon}
      <T style={{ color: colors.white, fontSize: 11, marginTop: 4 }}>{label}</T>
    </Pressable>
  );
}

function AddRow({ icon, title, hint, onPress }: { icon: React.ReactNode; title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.addRow, pressed && { backgroundColor: colors.soft }]}>
      <View style={[st.ico, st.icoFolder, { width: 46, height: 46 }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <T weight="semibold" style={{ fontSize: 16 }}>
          {title}
        </T>
        <T style={st.meta}>{hint}</T>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  crumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    minHeight: 44,
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
  },
  selHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 2,
  },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowHover: { backgroundColor: colors.soft, borderBottomColor: 'transparent' },
  rowDragged: { opacity: 0.35 },
  ico: {
    width: 46,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icoFolder: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icoDark: { backgroundColor: colors.ink },
  name: { fontSize: 15, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: colors.mute, marginTop: 2 },
  badge: {
    backgroundColor: colors.ink,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c9c9c6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkMark: {
    width: 10,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  hint: { textAlign: 'center', marginTop: 18 },
  emptyFolder: {
    textAlign: 'center',
    color: colors.mute,
    fontSize: 14,
    marginTop: 40,
  },
  parent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  parentHover: { backgroundColor: colors.ink, borderStyle: 'solid' },
  chip: {
    position: 'absolute',
    left: -50,
    top: -56,
    width: 100,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bar: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 72,
    borderRadius: 28,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  barBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    paddingVertical: 6,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    marginHorizontal: -10,
    borderRadius: 18,
  },
  sheetTitle: { fontSize: 22, letterSpacing: -0.7, marginBottom: 14 },
  input: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.soft,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.ink,
  },
});
