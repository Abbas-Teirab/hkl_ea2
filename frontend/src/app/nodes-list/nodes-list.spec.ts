import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodesList } from './nodes-list';

describe('NodesList', () => {
  let component: NodesList;
  let fixture: ComponentFixture<NodesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodesList],
    }).compileComponents();

    fixture = TestBed.createComponent(NodesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
