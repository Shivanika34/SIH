export default function AlertCard({ alert }) {
  return (
    <div style={{ border: "1px solid gray", margin: "10px" }}>
      <p>{alert.description}</p>
      <small>{alert.location}</small>
    </div>
  );
}
