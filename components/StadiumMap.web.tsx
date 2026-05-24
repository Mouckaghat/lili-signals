interface Props { uri: string }

export default function StadiumMap({ uri }: Props) {
  return (
    <iframe
      src={uri}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      title="Stadium location"
    />
  );
}
